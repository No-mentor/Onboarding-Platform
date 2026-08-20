package com.onboardos.onboarding.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.embedding.EmbeddingClient;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class EmbeddingServiceTest {

    private final EmbeddingClient client = mock(EmbeddingClient.class);
    private final EmbeddingService service = new EmbeddingService(client);

    @Test void isEnabledDelegatesToClientIsReady() {
        when(client.isReady()).thenReturn(true);
        assertThat(service.isEnabled()).isTrue();

        when(client.isReady()).thenReturn(false);
        assertThat(service.isEnabled()).isFalse();
    }

    @Test void embedReturnsNullWhenDisabled() {
        when(client.isReady()).thenReturn(false);
        assertThat(service.embed("hello")).isNull();
        verify(client, never()).embedAll(anyList());
    }

    @Test void embedReturnsNullForBlankTextWithoutCallingClient() {
        when(client.isReady()).thenReturn(true);
        assertThat(service.embed(null)).isNull();
        assertThat(service.embed("   ")).isNull();
        verify(client, never()).embedAll(anyList());
    }

    @Test void embedDelegatesSingleTextAsBatchOfOne() {
        when(client.isReady()).thenReturn(true);
        float[] vector = {1f, 2f, 3f};
        when(client.embedAll(List.of("hello"))).thenReturn(List.of(vector));

        assertThat(service.embed("hello")).isEqualTo(vector);
    }

    @Test void embedAllReturnsEmptyListWhenDisabled() {
        when(client.isReady()).thenReturn(false);
        assertThat(service.embedAll(List.of("a", "b"))).isEmpty();
        verify(client, never()).embedAll(anyList());
    }

    @Test void embedAllReturnsEmptyListForNullOrEmptyInput() {
        when(client.isReady()).thenReturn(true);
        assertThat(service.embedAll(null)).isEmpty();
        assertThat(service.embedAll(List.of())).isEmpty();
        verify(client, never()).embedAll(anyList());
    }

    @Test void embedAllFiltersBlanksAndKeepsPositionalNulls() {
        when(client.isReady()).thenReturn(true);
        float[] v1 = {1f};
        float[] v2 = {2f};
        // 인덱스 0,2가 공백 → 배치 호출에는 "b","d"만 전달되어야 함
        when(client.embedAll(List.of("b", "d"))).thenReturn(List.of(v1, v2));

        List<float[]> result = service.embedAll(Arrays.asList("", "b", null, "d"));

        assertThat(result).hasSize(4);
        assertThat(result.get(0)).isNull();
        assertThat(result.get(1)).isEqualTo(v1);
        assertThat(result.get(2)).isNull();
        assertThat(result.get(3)).isEqualTo(v2);
    }

    @Test void embedAllSkipsClientCallWhenAllTextsAreBlank() {
        when(client.isReady()).thenReturn(true);
        List<float[]> result = service.embedAll(Arrays.asList("", "   ", null));

        assertThat(result).containsExactly((float[]) null, null, null);
        verify(client, never()).embedAll(anyList());
    }

    @Test void toPgVectorLiteralFormatsAsPgvectorArray() {
        assertThat(service.toPgVectorLiteral(new float[]{1f, 2.5f})).isEqualTo("[1.0,2.5]");
        assertThat(service.toPgVectorLiteral(null)).isNull();
        assertThat(service.toPgVectorLiteral(new float[0])).isNull();
    }
}