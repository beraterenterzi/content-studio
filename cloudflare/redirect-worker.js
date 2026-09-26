const TERZI_ORIGIN = "https://terzi.orbitvideolab.workers.dev";

export default {
  fetch(request) {
    const target = new URL(request.url);
    const destination = new URL(`${target.pathname}${target.search}`, TERZI_ORIGIN);
    return Response.redirect(destination.toString(), 308);
  }
};