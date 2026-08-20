package com.onboardos.onboarding.global.config;

import com.onboardos.onboarding.global.time.BusinessClock;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * "오늘 날짜"는 한국 사용자 기준(Asia/Seoul)으로 계산해야 하는 서비스들이 주입받는
 * {@link BusinessClock} 빈을 등록한다. 자세한 이유는 {@link BusinessClock} 참고.
 *
 * 이 빈은 {@code java.time.Clock} 타입이 아니라 전용 래퍼 타입이라, 문서 정리 배치가 쓰는
 * UTC 전용 {@code Clock} 빈({@code SchedulingConfig.systemClock})과 타입이 겹치지 않는다.
 */
@Configuration
public class ClockConfig {

    @Bean
    public BusinessClock businessClock() {
        return new BusinessClock(Clock.system(BusinessClock.ZONE));
    }
}
