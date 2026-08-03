package com.onboardos.onboarding.ai;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.output.Response;
import jakarta.annotation.PostConstruct;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmService {

    private final AiProperties aiProperties;
    private ChatLanguageModel chatModel;

    @PostConstruct
    void init() {
        if (aiProperties.isOpenAiReady()) {
            chatModel = OpenAiChatModel.builder()
                    .apiKey(aiProperties.getOpenaiApiKey())
                    .modelName(aiProperties.getChatModel())
                    .temperature(0.2)
                    .build();
            log.info("OpenAI Chat model ready: {}", aiProperties.getChatModel());
        }
    }

    public boolean isEnabled() {
        return chatModel != null;
    }

    public String answerWithCitations(String question, List<String> groundedSnippets) {
        if (!isEnabled()) {
            return null;
        }
        StringBuilder context = new StringBuilder();
        for (int i = 0; i < groundedSnippets.size(); i++) {
            context.append("[").append(i + 1).append("] ").append(groundedSnippets.get(i)).append("\n");
        }

        String system = """
                당신은 기업 온보딩 Knowledge Assistant 입니다.
                제공된 근거 문서 내용만으로 답하세요.
                근거에 없는 사내 정보는 단정하지 말고, 모른다고 말하세요.
                답변 끝에 사용한 근거 번호 [1], [2] 를 표기하세요.
                한국어로 답하세요.
                """;

        String user = "질문: " + question + "\n\n근거 문서:\n" + context;

        Response<AiMessage> response = chatModel.generate(
                SystemMessage.from(system),
                UserMessage.from(user)
        );
        return response.content().text();
    }

    public String modelName() {
        return aiProperties.getChatModel();
    }
}
