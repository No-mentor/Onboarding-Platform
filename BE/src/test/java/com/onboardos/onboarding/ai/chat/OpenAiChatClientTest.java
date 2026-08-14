package com.onboardos.onboarding.ai.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.onboardos.onboarding.ai.AiProperties;
import dev.ai4j.openai4j.OpenAiHttpException;
import org.junit.jupiter.api.Test;

class OpenAiChatClientTest {
    @Test void disabledAiDoesNotCreateModelOrCallNetwork() {
        AiProperties properties = new AiProperties();
        properties.setEnabled(false);
        properties.setOpenaiApiKey("fake-test-key");
        OpenAiChatClient client = new OpenAiChatClient(properties);
        client.init();

        assertThat(client.isReady()).isFalse();
        assertThatCode(() -> assertThat(client.generate("system", "user")).isNull())
                .doesNotThrowAnyException();
    }

    @Test void safelyClassifiesRateLimitAndServerErrorsWithoutResponseBody() {
        ChatProviderException rateLimit = OpenAiChatClient.classify(
                new OpenAiHttpException(429, "upstream-secret-body"));
        ChatProviderException serverError = OpenAiChatClient.classify(
                new OpenAiHttpException(503, "upstream-secret-body"));

        assertThat(rateLimit).hasMessageContaining("429").hasMessageNotContaining("upstream-secret-body");
        assertThat(serverError).hasMessageContaining("503").hasMessageNotContaining("upstream-secret-body");
    }
}
