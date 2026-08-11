package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class LocalDocumentStorageTest {
    @TempDir Path root;

    @Test
    void storesAndReadsAFile() throws Exception {
        LocalDocumentStorage storage = new LocalDocumentStorage(root.toString());
        UUID workspaceId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile("file", "guide.txt", "text/plain", "hello".getBytes());

        String key = storage.store(workspaceId, file);

        assertThat(key).startsWith(workspaceId + "/").endsWith("_guide.txt");
        assertThat(Files.exists(root.resolve(key))).isTrue();
        assertThat(storage.readText(key)).isEqualTo("hello");
    }

    @Test void deletesFileAndTreatsMissingFileAsAlreadyDeleted() throws Exception {
        LocalDocumentStorage storage = new LocalDocumentStorage(root.toString());
        UUID workspaceId = UUID.randomUUID();
        String key = storage.store(workspaceId,
                new MockMultipartFile("file", "guide.pdf", "application/pdf", "%PDF-".getBytes()));
        storage.delete(key);
        storage.delete(key);
        assertThat(Files.exists(root.resolve(key))).isFalse();
    }

    @Test void rejectsDeleteOutsideStorageRoot() {
        LocalDocumentStorage storage = new LocalDocumentStorage(root.toString());
        assertThatThrownBy(() -> storage.delete("../outside.pdf"))
                .isInstanceOf(com.onboardos.onboarding.global.exception.BusinessException.class);
    }
}
