package com.onboardos.onboarding.ai.embedding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.onboardos.onboarding.ai.AiProperties;
import dev.ai4j.openai4j.OpenAiHttpException;
import java.util.List;
import org.junit.jupiter.api.Test;

class OpenAiEmbeddingClientTest {

    @Test void notReadyWhenAiDisabled() {
        AiProperties properties = new AiProperties();
        properties.setEnabled(false);
        properties.setOpenaiApiKey("sk-test-key");

        OpenAiEmbeddingClient client = new OpenAiEmbeddingClient(properties);
        client.init();

        assertThat(client.isReady()).isFalse();
    }

    @Test void notReadyWhenApiKeyMissing() {
        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        properties.setOpenaiApiKey("");

        OpenAiEmbeddingClient client = new OpenAiEmbeddingClient(properties);
        client.init();

        assertThat(client.isReady()).isFalse();
    }

    @Test void embedAllReturnsEmptyWithoutNetworkCallWhenNotReady() {
        AiProperties properties = new AiProperties();
        properties.setEnabled(false);

        OpenAiEmbeddingClient client = new OpenAiEmbeddingClient(properties);
        client.init();

        // AI_ENABLED=false 상태에서는 실제 OpenAI 호출을 시도하지 않고 즉시 빈 리스트를 반환해야 한다.
        assertThatCode(() -> assertThat(client.embedAll(List.of("hello"))).isEmpty())
                .doesNotThrowAnyException();
    }

    @Test void classifiesAuthAndPermissionErrorsAsConfigurationError() {
        assertThat(OpenAiEmbeddingClient.classify(new OpenAiHttpException(401, "unauthorized")))
                .isInstanceOf(EmbeddingConfigurationException.class);
        assertThat(OpenAiEmbeddingClient.classify(new OpenAiHttpException(403, "forbidden")))
                .isInstanceOf(EmbeddingConfigurationException.class);
    }

    @Test void classifiesOtherHttpErrorsAsProviderError() {
        assertThat(OpenAiEmbeddingClient.classify(new OpenAiHttpException(429, "rate limited")))
                .isInstanceOf(EmbeddingProviderException.class);
        assertThat(OpenAiEmbeddingClient.classify(new OpenAiHttpException(500, "server error")))
                .isInstanceOf(EmbeddingProviderException.class);
        assertThat(OpenAiEmbeddingClient.classify(new OpenAiHttpException(503, "unavailable")))
                .isInstanceOf(EmbeddingProviderException.class);
    }

    @Test void rejectsEmbeddingDimensionMismatchWithoutPaddingOrTruncation() {
        assertThatThrownBy(() -> OpenAiEmbeddingClient.validateDimensions(
                List.of(new float[1535]), 1536))
                .isInstanceOf(EmbeddingConfigurationException.class)
                .hasMessageNotContaining("[")
                .hasMessageNotContaining("key");
    }
}
