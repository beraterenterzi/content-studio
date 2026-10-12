import asyncio
import json
import math
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


def font(size: int, bold: bool = False):
    names = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size=size)
    return ImageFont.load_default()


def wrap(text: str, width: int):
    words = re.sub(r"\s+", " ", text).strip().split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def download(url: str, target: Path):
    local_source = Path(url)
    if local_source.exists():
        shutil.copyfile(local_source, target)
        return
    request = urllib.request.Request(
        url, headers={"User-Agent": "YouTube-AI-Studio/0.1"}
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        target.write_bytes(response.read())


def create_visual(source: Path, target: Path, title: str, width: int, height: int,
                  fit_mode: str):
    with Image.open(source) as original:
        original = original.convert("RGB")
        ratio = max(width / original.width, height / original.height)
        resized = original.resize(
            (math.ceil(original.width * ratio), math.ceil(original.height * ratio)),
            Image.Resampling.LANCZOS,
        )
        left = (resized.width - width) // 2
        top = (resized.height - height) // 2
        cover = resized.crop((left, top, left + width, top + height))
        if fit_mode == "contain":
            canvas = ImageEnhance.Brightness(
                cover.filter(ImageFilter.GaussianBlur(28))
            ).enhance(0.48)
            foreground = original.copy()
            foreground.thumbnail((width - 80, height - 260), Image.Resampling.LANCZOS)
            x = (width - foreground.width) // 2
            y = (height - foreground.height) // 2 + 45
            canvas.paste(foreground, (x, y))
        else:
            canvas = cover

        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        pad = max(36, round(width * .045))
        header_bottom = 218 if height > width else 190
        draw.rounded_rectangle(
            (pad, 38, width - pad, header_bottom), 28, fill=(8, 8, 12, 200)
        )
        draw.text((pad + 34, 65), "Content Studio", font=font(28, True), fill="#ff5369")
        title_lines = wrap(title, 48 if width > height else 30)[:2]
        for index, line in enumerate(title_lines):
            draw.text(
                (pad + 34, 108 + index * 42),
                line, font=font(34, True),
                fill="white",
            )
        Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB").save(
            target, quality=94
        )


def make_srt(text: str, target: Path, exact_total: float | None = None):
    words = re.sub(r"\s+", " ", text).strip().split()
    chunks = [" ".join(words[index:index + 7]) for index in range(0, len(words), 7)]
    if not chunks:
        chunks = [text.strip()]
    weights = [max(1.4, len(chunk.split()) / 2.65) for chunk in chunks]
    durations = ([exact_total * weight / sum(weights) for weight in weights]
                 if exact_total and exact_total > 0 else weights)
    seconds = 0
    blocks = []
    for index, (chunk, duration) in enumerate(zip(chunks, durations), 1):
        start, end = seconds, seconds + duration
        fmt = lambda value: (
            f"00:{int(value // 60):02d}:{int(value % 60):02d},"
            f"{int((value % 1) * 1000):03d}"
        )
        blocks.append(f"{index}\n{fmt(start)} --> {fmt(end)}\n{chunk}\n")
        seconds = end
    target.write_text("\n".join(blocks), encoding="utf-8")
    return seconds


async def synthesize(text: str, target: Path, voice: str):
    communicate = edge_tts.Communicate(text, voice, rate="0%")
    await communicate.save(str(target))


def probe_audio_duration(ffmpeg: str, audio: Path):
    result = subprocess.run(
        [ffmpeg, "-i", str(audio), "-f", "null", "-"],
        capture_output=True, text=True
    )
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not match:
        return None
    return int(match.group(1)) * 3600 + int(match.group(2)) * 60 + float(match.group(3))


async def main():
    job_path = Path(sys.argv[1]).resolve()
    job = json.loads(job_path.read_text(encoding="utf-8"))
    output_dir = Path(job["outputDir"]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    audio = output_dir / "narration.mp3"
    captions = output_dir / "captions.srt"
    credits_file = output_dir / "credits.txt"
    video = output_dir / "video.mp4"

    image_urls = job.get("imageUrls") or [job["imageUrl"]]
    credits = job.get("credits") or [job.get("credit", "")]
    visuals = []
    for index, image_url in enumerate(image_urls):
        source = output_dir / f"source-{index + 1}.jpg"
        visual = output_dir / f"visual-{index + 1}.jpg"
        download(image_url, source)
        content_type = job.get("contentType") or "shorts"
        width, height = (1920, 1080) if content_type == "youtube" else (1080, 1920)
        create_visual(
            source, visual, job["title"], width, height,
            job.get("imageFit") or "cover"
        )
        visuals.append(visual)
    credit_lines = [
        "VISUAL CREDITS — copy this section into the YouTube description",
        "",
        *[credit for credit in credits if credit.strip()],
        "",
        "Visuals were cropped and animated for a vertical video."
    ]
    credits_file.write_text("\n".join(credit_lines), encoding="utf-8")
    await synthesize(
        job["narration"],
        audio,
        job.get("voice") or "tr-TR-AhmetNeural",
    )

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    total_seconds = make_srt(
        job["narration"], captions, probe_audio_duration(ffmpeg, audio)
    )
    subtitle_path = str(captions).replace("\\", "/").replace(":", "\\:")
    segment_seconds = max(1.0, total_seconds / len(visuals))
    frames = max(1, math.ceil(segment_seconds * 30))
    zoom_speed = "0.00085" if job.get("visualStyle") == "animated" else "0.00055"
    visual_filters = []
    for index in range(len(visuals)):
        visual_filters.append(
            f"[{index}:v]scale={width * 4}:{height * 4}:flags=lanczos,"
            f"zoompan=z='min(zoom+{zoom_speed},1.10)':"
            f"x='trunc((iw-iw/zoom)/2/2)*2':"
            f"y='trunc((ih-ih/zoom)/2/2)*2':"
            f"d={frames}:s={width}x{height}:fps=30,"
            f"trim=duration={segment_seconds},setpts=PTS-STARTPTS[v{index}]"
        )
    concat_inputs = "".join(f"[v{index}]" for index in range(len(visuals)))
    video_filter = ";".join(visual_filters) + ";" + (
        f"{concat_inputs}concat=n={len(visuals)}:v=1:a=0[slideshow]"
    )
    if job.get("burnCaptions", True):
        video_filter += (
            f";[slideshow]subtitles='{subtitle_path}':"
            "force_style='FontName=Arial,FontSize=14,Bold=1,"
            "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
            "BackColour=&H80000000,BorderStyle=3,Outline=2,Shadow=1,"
            "Alignment=2,MarginV=105'[video]"
        )
    else:
        video_filter += ";[slideshow]null[video]"
    command = [ffmpeg, "-y"]
    for visual in visuals:
        command.extend(["-loop", "1", "-framerate", "30", "-i", str(visual)])
    command.extend([
        "-i", str(audio),
        "-filter_complex", video_filter,
        "-map", "[video]",
        "-map", f"{len(visuals)}:a",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-pix_fmt",
        "yuv420p",
        "-shortest",
        "-movflags",
        "+faststart",
        str(video),
    ])
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode:
        raise RuntimeError(completed.stderr[-3000:])

    print(
        json.dumps(
            {
                "video": str(video),
                "audio": str(audio),
                "captions": str(captions),
                "credits": str(credits_file),
                "visuals": [str(item) for item in visuals],
                "imageCount": len(visuals),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
