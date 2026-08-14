package com.onboardos.onboarding.ai.chat;

public interface ChatClient {
    boolean isReady();
    String generate(String systemPrompt, String userPrompt);
}
