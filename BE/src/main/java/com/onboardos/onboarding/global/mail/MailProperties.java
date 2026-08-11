package com.onboardos.onboarding.global.mail;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.mail")
public class MailProperties {
    private String from = "no-reply@onboardos.com";
    private String frontendUrl = "http://localhost:3000";
}