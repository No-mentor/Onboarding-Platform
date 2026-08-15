package com.onboardos.onboarding.ai;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {
    private boolean enabled = false;
    private String openaiApiKey = "";
    private String embeddingModel = "text-embedding-3-small";
    private String chatModel = "gpt-4o-mini";
    private int embeddingDimension = 1536;
    private long embeddingTimeoutMs = 10_000L;
    private long chatTimeoutMs = 20_000L;
    private int maxSearchChunks = 20;
    private int maxContextChunks = 5;
    private int maxContextChars = 6_000;

    public boolean isOpenAiReady() {
        return enabled && openaiApiKey != null && !openaiApiKey.isBlank();
    }
}
