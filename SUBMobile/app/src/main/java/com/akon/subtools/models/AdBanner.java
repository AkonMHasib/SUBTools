package com.akon.subtools.models;

public class AdBanner {
    private String imageUrl;
    private String targetUrl;
    private boolean enabled;

    public AdBanner() {
        this.enabled = true;
    }

    public AdBanner(String imageUrl, String targetUrl, boolean enabled) {
        this.imageUrl = imageUrl;
        this.targetUrl = targetUrl;
        this.enabled = enabled;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getTargetUrl() {
        return targetUrl;
    }

    public void setTargetUrl(String targetUrl) {
        this.targetUrl = targetUrl;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
