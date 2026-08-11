package com.onboardos.onboarding.global.config;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {
    @Bean
    @ConditionalOnMissingBean(Clock.class)
    Clock systemClock() {
        return Clock.systemUTC();
    }
}
