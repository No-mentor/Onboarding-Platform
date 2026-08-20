package com.onboardos.onboarding.chat;

import com.onboardos.onboarding.chat.dto.ChatSessionDetailResponse;
import com.onboardos.onboarding.chat.dto.ChatSessionSummaryResponse;
import com.onboardos.onboarding.chat.dto.SendMessageRequest;
import com.onboardos.onboarding.chat.dto.SendMessageResponse;
import com.onboardos.onboarding.global.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Chat")
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "질문 전송 (RAG + Permission + Citation)")
    @PostMapping("/messages")
    public SendMessageResponse send(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return chatService.send(SecurityUtils.currentUser(), workspaceId, request);
    }

    @Operation(summary = "채팅 세션 목록")
    @GetMapping("/sessions")
    public Map<String, List<ChatSessionSummaryResponse>> sessions(
            @RequestHeader("X-Workspace-Id") UUID workspaceId
    ) {
        return Map.of("items", chatService.sessions(SecurityUtils.currentUser(), workspaceId));
    }

    @Operation(summary = "세션 메시지 조회")
    @GetMapping("/sessions/{sessionId}")
    public ChatSessionDetailResponse detail(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID sessionId
    ) {
        return chatService.sessionDetail(SecurityUtils.currentUser(), workspaceId, sessionId);
    }
}
