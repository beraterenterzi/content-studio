package com.orbitvideolab.terzi;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ReleaseConfigTest {

    @Test
    public void releasePackageId_isStable() {
        assertEquals("com.orbitvideolab.terzi", BuildConfig.APPLICATION_ID);
    }
}
