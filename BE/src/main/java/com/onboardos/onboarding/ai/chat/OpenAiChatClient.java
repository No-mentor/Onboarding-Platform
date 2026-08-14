package com.onboardos.onboarding.ai.chat;

import com.onboardos.onboarding.ai.AiProperties;
import dev.ai4j.openai4j.OpenAiHttpException;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.output.Response;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiChatClient implements ChatClient {
    private final AiProperties properties;
    private ChatLanguageModel model;

    @PostConstruct
    void init() {
        if (!properties.isOpenAiReady()) {
            if (properties.isEnabled()) {
                log.warn("OpenAI Chat client disabled because OPENAI_API_KEY is not configured");
            } else {
                log.info("OpenAI Chat client disabled; template fallback is active");
            }
            return;
        }
        model = OpenAiChatModel.builder()
                .apiKey(properties.getOpenaiApiKey())
                .modelName(properties.getChatModel())
                .temperature(0.2)
                .timeout(Duration.ofMillis(properties.getChatTimeoutMs()))
                .maxRetries(0)
                .build();
        log.info("OpenAI Chat client ready: model={}, timeoutMs={}",
                properties.getChatModel(), properties.getChatTimeoutMs());
    }

    @Override public boolean isReady() {
        return model != null;
    }

    @Override public String generate(String systemPrompt, String userPrompt) {
        if (!isReady()) return null;
        try {
            Response<AiMessage> response = model.generate(
                    SystemMessage.from(systemPrompt), UserMessage.from(userPrompt));
            return response.content().text();
        } catch (OpenAiHttpException exception) {
            throw classify(exception);
        } catch (Exception exception) {
            throw new ChatProviderException("OpenAI chat request failed safely", exception);
        }
    }

    static ChatProviderException classify(OpenAiHttpException exception) {
        return new ChatProviderException("OpenAI chat request failed with status " + exception.code(), exception);
    }
}
