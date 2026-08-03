package com.onboardos.onboarding.document;

import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentStorageService {

    private final Path root;

    public DocumentStorageService(@Value("${app.storage.root:./storage}") String rootPath) {
        this.root = Path.of(rootPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new IllegalStateException("스토리지 디렉터리 생성 실패: " + this.root, e);
        }
    }

    public String store(UUID workspaceId, MultipartFile file) {
        try {
            Path dir = root.resolve(workspaceId.toString());
            Files.createDirectories(dir);
            String key = workspaceId + "/" + UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
            Path target = root.resolve(key);
            Files.createDirectories(target.getParent());
            file.transferTo(target);
            return key;
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "파일 저장에 실패했습니다.");
        }
    }

    public String readText(String storageKey) {
        try {
            Path path = root.resolve(storageKey);
            if (!Files.exists(path)) {
                return "";
            }
            String name = path.getFileName().toString().toLowerCase();
            if (name.endsWith(".pdf")) {
                // MVP: PDF 바이너리는 텍스트 추출 라이브러리 없이 메타 안내 청크만 생성
                return "PDF 문서: " + name + "\n(온보딩용 텍스트 추출은 후속 고도화. 파일은 저장됨.)";
            }
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "파일 읽기에 실패했습니다.");
        }
    }

    private String sanitize(String name) {
        if (name == null || name.isBlank()) {
            return "file.bin";
        }
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
