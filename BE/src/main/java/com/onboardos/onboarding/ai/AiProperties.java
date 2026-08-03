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

    public boolean isOpenAiReady() {
        return enabled && openaiApiKey != null && !openaiApiKey.isBlank();
    }
}
