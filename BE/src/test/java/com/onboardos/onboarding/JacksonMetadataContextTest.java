package com.onboardos.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.audit.AuditService;
import com.onboardos.onboarding.chat.ChatService;
import com.onboardos.onboarding.document.DocumentChunkVectorRepository;
import com.onboardos.onboarding.document.DocumentIngestService;
import com.onboardos.onboarding.document.DocumentPermissionService;
import com.onboardos.onboarding.document.DocumentStorage;
import com.onboardos.onboarding.document.PageChunker;
import com.onboardos.onboarding.document.PdfTextExtractor;
import com.onboardos.onboarding.domain.chat.ChatMessageRepository;
import com.onboardos.onboarding.domain.chat.ChatSessionRepository;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;

class JacksonMetadataContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withUserConfiguration(DocumentIngestService.class, ChatService.class)
            .withBean(EntityManagerFactory.class, () -> mock(EntityManagerFactory.class))
            .withBean(DocumentRepository.class, () -> mock(DocumentRepository.class))
            .withBean(DocumentChunkRepository.class, () -> mock(DocumentChunkRepository.class))
            .withBean(DocumentChunkVectorRepository.class, () -> mock(DocumentChunkVectorRepository.class))
            .withBean(DocumentStorage.class, () -> mock(DocumentStorage.class))
            .withBean(EmbeddingService.class, () -> mock(EmbeddingService.class))
            .withBean(PdfTextExtractor.class, PdfTextExtractor::new)
            .withBean(PageChunker.class, PageChunker::new)
            .withBean(ChatSessionRepository.class, () -> mock(ChatSessionRepository.class))
            .withBean(ChatMessageRepository.class, () -> mock(ChatMessageRepository.class))
            .withBean(DocumentPermissionService.class, () -> mock(DocumentPermissionService.class))
            .withBean(WorkspaceAccessService.class, () -> mock(WorkspaceAccessService.class))
            .withBean(AuditService.class, () -> mock(AuditService.class))
            .withBean(LlmService.class, () -> mock(LlmService.class));

    @Test
    void springContextCreatesMetadataServicesWithJackson3ObjectMapper() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(ObjectMapper.class);
            assertThat(context).hasSingleBean(DocumentIngestService.class);
            assertThat(context).hasSingleBean(ChatService.class);
        });
    }
}
