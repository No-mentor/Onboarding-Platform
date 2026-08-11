package com.onboardos.onboarding.document;

import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalDocumentStorage implements DocumentStorage {
    private final Path root;
    public LocalDocumentStorage(@Value("${app.storage.root:./storage}") String rootPath) {
        root = Path.of(rootPath).toAbsolutePath().normalize();
        try { Files.createDirectories(root); }
        catch (IOException e) { throw new IllegalStateException("로컬 문서 저장 디렉터리를 생성할 수 없습니다.", e); }
    }
    @Override public String store(UUID workspaceId, MultipartFile file) {
        try {
            Files.createDirectories(root.resolve(workspaceId.toString()));
            String key = workspaceId + "/" + UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
            file.transferTo(safePath(key));
            return key;
        } catch (IOException e) { throw new BusinessException(ErrorCode.DOCUMENT_STORAGE_ERROR, "문서 파일을 로컬 저장소에 저장하지 못했습니다."); }
    }
    @Override public String readText(String storageKey) {
        try {
            Path path = safePath(storageKey);
            if (!Files.exists(path)) return "";
            if (path.getFileName().toString().toLowerCase().endsWith(".pdf")) return pdfPlaceholder(path.getFileName().toString());
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) { throw new BusinessException(ErrorCode.DOCUMENT_STORAGE_ERROR, "문서 파일을 로컬 저장소에서 읽지 못했습니다."); }
    }
    @Override public void delete(String storageKey) {
        try {
            Files.deleteIfExists(safePath(storageKey));
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.DOCUMENT_STORAGE_ERROR, "문서 파일을 로컬 저장소에서 삭제하지 못했습니다.");
        }
    }
    private Path safePath(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "올바르지 않은 문서 저장 경로입니다.");
        return path;
    }
    private String sanitize(String name) { return name == null || name.isBlank() ? "file.bin" : name.replaceAll("[^a-zA-Z0-9._-]", "_"); }
    static String pdfPlaceholder(String name) { return "PDF 문서: " + name + "\n(온보딩용 텍스트 추출은 후속 고도화. 파일은 저장됨.)"; }
}
