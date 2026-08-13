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
    private long embeddingTimeoutMs = 10_000L; // 일반적인 관례상 임의로 10초로 해둠, 명세서엔 없음

    public boolean isOpenAiReady() {
        return enabled && openaiApiKey != null && !openaiApiKey.isBlank();
    }
}
