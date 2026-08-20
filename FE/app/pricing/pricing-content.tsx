'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, CreditCard, HelpCircle, Layers, Minus, Sparkles, Users } from 'lucide-react';
import styles from './pricing.module.css';

type Cycle = 'monthly' | 'annual';

/** 로케일 구현 차이로 인한 하이드레이션 불일치를 피하려고 직접 자릿수를 끊는다. */
const won = (value: number) => `₩${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const PILLARS = [
  {
    icon: Layers,
    kicker: 'Platform Fee',
    title: '워크스페이스 기본료',
    description:
      '문서 저장과 역할 권한, 감사 로그, 관리자 대시보드를 포함한 운영 기반입니다. 도입의 문턱을 담당합니다.',
    tag: '고정',
  },
  {
    icon: Users,
    kicker: 'Active Seat',
    title: '활성 온보딩 시트',
    description:
      '온보딩 계획이 진행 중인 신입 1명이 한 달 동안 차지하는 자리입니다. 30일 계획이 끝나면 자동 해제되며, 성장의 기울기를 담당합니다.',
    tag: '변동 · 주 수익원',
  },
  {
    icon: Sparkles,
    kicker: 'AI Credit',
    title: '인공지능 사용량',
    description:
      '질문 응답과 계획 생성, 재생성, 인사이트 분석에 쓰입니다. 추론 원가에 직접 연동해 마진의 하한을 지킵니다.',
    tag: '종량 · 초과분만',
  },
];

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  customPrice?: string;
  seatLabel: string;
  seatExtra: string;
  features: string[];
  ctaLabel: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: '팀 1개 파일럿',
    monthly: 0,
    annual: 0,
    seatLabel: '동시 온보딩 2명',
    seatExtra: '시트 추가 불가',
    features: [
      '문서 20개 · 200MB',
      'AI 크레딧 월 100',
      '계획 재생성 월 2회',
      '템플릿 1개',
      '감사 로그 7일',
    ],
    ctaLabel: '무료로 시작하기',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: '20~50인 규모',
    monthly: 99000,
    annual: 82500,
    seatLabel: '동시 온보딩 5명',
    seatExtra: `추가 ${won(19000)} / 명·월`,
    features: [
      '문서 200개 · 2GB',
      'AI 크레딧 월 3,000',
      '계획 재생성 무제한',
      '템플릿 10개',
      '주간 AI 인사이트',
      '감사 로그 30일',
    ],
    ctaLabel: '시작하기',
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: '50~500인 규모',
    monthly: 390000,
    annual: 325000,
    seatLabel: '동시 온보딩 20명',
    seatExtra: `추가 ${won(15000)} / 명·월`,
    features: [
      '문서 2,000개 · 20GB',
      'AI 크레딧 월 20,000',
      '템플릿 무제한',
      '실시간 AI 인사이트',
      '감사 로그 1년',
      'SSO · SCIM 연동',
      'TTP 개선 리포트',
    ],
    ctaLabel: '시작하기',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: '500인 이상 · 규제 산업',
    monthly: null,
    annual: null,
    customPrice: '별도 협의',
    seatLabel: '온보딩 시트 무제한',
    seatExtra: '볼륨 계약',
    features: [
      '문서 · 스토리지 무제한',
      'AI 크레딧 무제한',
      '감사 로그 무기한 · 내보내기',
      'Dedicated VPC · DB · VectorDB',
      '커스텀 인사이트',
      '전담 CSM · SLA',
    ],
    ctaLabel: '도입 문의',
  },
];

type Cell = string | boolean;

const COMPARISON: { group: string; rows: { label: string; values: Cell[] }[] }[] = [
  {
    group: '온보딩 시트',
    rows: [
      { label: '동시 온보딩 시트', values: ['2', '5', '20', '무제한'] },
      {
        label: '시트 추가 단가',
        values: [false, `${won(19000)} / 명·월`, `${won(15000)} / 명·월`, '볼륨 계약'],
      },
      {
        label: '관리자 · 멘토 · 기존 직원',
        values: ['무제한 무료', '무제한 무료', '무제한 무료', '무제한 무료'],
      },
    ],
  },
  {
    group: '문서와 지식',
    rows: [
      { label: '문서 수', values: ['20개', '200개', '2,000개', '무제한'] },
      { label: '스토리지', values: ['200MB', '2GB', '20GB', '무제한'] },
      { label: '템플릿 저장', values: ['1개', '10개', '무제한', '무제한'] },
    ],
  },
  {
    group: '인공지능',
    rows: [
      { label: 'AI 크레딧 (월)', values: ['100', '3,000', '20,000', '무제한'] },
      { label: '계획 재생성', values: ['월 2회', '무제한', '무제한', '무제한'] },
      { label: 'AI 인사이트 (병목 분석)', values: [false, '주간', '실시간', '실시간 + 커스텀'] },
      { label: 'TTP 개선 리포트', values: [false, false, true, true] },
    ],
  },
  {
    group: '보안과 운영',
    rows: [
      { label: '역할 기반 접근 제어', values: [true, true, true, true] },
      { label: '감사 로그 보관', values: ['7일', '30일', '1년', '무기한'] },
      { label: 'SSO · SCIM', values: [false, false, true, true] },
      { label: 'Dedicated VPC · DB · VectorDB', values: [false, false, false, true] },
      { label: '전담 CSM · SLA', values: [false, false, false, true] },
    ],
  },
];

const PRINCIPLES = [
  {
    title: '가치 단위로 과금한다',
    description: '신입 수가 곧 고객이 얻는 가치입니다. 전 직원 좌석 과금은 구매 결정을 막습니다.',
  },
  {
    title: '원가는 크레딧으로 흡수한다',
    description: '인공지능 사용량이 마진을 잠식하지 않도록 종량 구간을 분리했습니다.',
  },
  {
    title: '쓰지 않는 달은 청구하지 않는다',
    description: '채용이 없는 달의 부담이 없어야 고객이 이탈하지 않습니다.',
  },
  {
    title: '사용자에게 한도를 보이지 않는다',
    description: '질문을 망설이게 만드는 순간 제품 가치가 무너집니다. 크레딧은 구매자의 언어입니다.',
  },
  {
    title: '성장이 곧 확장이다',
    description: '고객의 채용 증가가 추가 영업 없이 그대로 매출 증가로 연결됩니다.',
  },
];

const FAQS = [
  {
    question: '전 직원 수만큼 비용을 내야 하나요?',
    answer:
      '아닙니다. 비용은 온보딩이 진행 중인 신입 수에만 연동됩니다. 관리자와 멘토, 기존 직원은 인원 제한 없이 무료입니다. 100명 규모 조직이라도 이번 달 온보딩 중인 신입이 3명이라면 시트 3개만 청구되는 설계입니다.',
  },
  {
    question: '채용이 없는 달에도 시트 비용이 나가나요?',
    answer:
      '나가지 않습니다. 30일 계획이 종료되면 해당 시트는 자동으로 해제되어 다음 청구에서 빠집니다. 채용이 없는 달에는 워크스페이스 기본료만 남습니다.',
  },
  {
    question: 'AI 크레딧을 다 쓰면 서비스가 멈추나요?',
    answer:
      '멈추지 않는 구조로 설계했습니다. 초과분은 1,000 크레딧당 9,000원으로 정산되며, 관리자 화면에서 상한과 자동 충전 여부를 설정합니다. 신입에게는 잔량이 보이지 않으므로 질문을 망설일 일이 없습니다.',
  },
  {
    question: '연간 결제하면 얼마나 절약되나요?',
    answer:
      '연간 선결제 시 두 달치가 무료입니다. Starter는 월 환산 82,500원, Growth는 월 환산 325,000원이 되어 약 17%를 절감합니다. 현금흐름과 리텐션을 동시에 확보하기 위한 장치입니다.',
  },
  {
    question: '왜 시트 단위 과금을 선택했나요?',
    answer:
      '온보딩은 전 직원이 매일 쓰는 도구가 아니라 신입에게 집중되는 도구입니다. 좌석 과금은 실제 사용자보다 훨씬 큰 금액을 청구하게 되어 도입 저항을 만듭니다. 시트 단위는 고객이 얻는 가치와 지불하는 금액을 같은 축에 두고, 고객의 채용 성장이 그대로 매출 성장으로 이어지게 합니다.',
  },
];

export default function PricingContent() {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            <Image src="/logo.png" alt="MenTalk 로고" width={40} height={40} />
            <span className={styles.logoText}>MenTalk</span>
          </Link>
          <nav className={styles.nav}>
            <Link href="/#features" className={styles.navLink}>
              기능
            </Link>
            <Link href="/pricing" className={`${styles.navLink} ${styles.navLinkActive}`}>
              요금제
            </Link>
            <Link href="/login" className={styles.navLink}>
              로그인
            </Link>
            <Link href="/login" className={styles.navLink}>
              회원가입
            </Link>
          </nav>
        </div>
      </header>

      {/* 프로토타입 고지 */}
      <div className={styles.noticeBar} role="note">
        <span className={styles.noticeTag}>프로토타입</span>
        <span className={styles.noticeText}>
          이 페이지는 MenTalk의 <strong>사업화 전략을 설명하기 위한 프로토타입</strong>입니다.
          표기된 금액과 플랜은 수익 모델 설계안이며, 실제 결제와 문의 기능은 연결되어 있지 않습니다.
        </span>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBackground} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <CreditCard size={16} />
            수익 모델 설계안
          </div>
          <h1 className={styles.heroTitle}>
            <span className={styles.highlight}>채용한 만큼만</span> 냅니다
          </h1>
          <p className={styles.heroSubtitle}>
            전 직원 좌석이 아니라 온보딩이 진행 중인 신입 수에 연동되는 과금 구조입니다.
            고객이 얻는 가치와 지불하는 금액을 같은 축에 두어, 고객의 성장이 그대로 매출 성장으로
            이어지도록 설계했습니다.
          </p>

          <div className={styles.cycleToggle} role="group" aria-label="결제 주기 선택">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              aria-pressed={cycle === 'monthly'}
              className={`${styles.cycleButton} ${cycle === 'monthly' ? styles.cycleButtonActive : ''}`}
            >
              월간 결제
            </button>
            <button
              type="button"
              onClick={() => setCycle('annual')}
              aria-pressed={cycle === 'annual'}
              className={`${styles.cycleButton} ${cycle === 'annual' ? styles.cycleButtonActive : ''}`}
            >
              연간 결제
              <span className={styles.cycleSaving}>2개월 무료</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3층 과금 구조 */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>세 가지 요소로만 계산합니다</h2>
            <p className={styles.sectionSubtitle}>
              기본료는 도입의 문턱을, 시트는 성장의 기울기를, 크레딧은 마진의 하한을 담당합니다.
              숨은 항목은 없습니다.
            </p>
          </div>

          <div className={styles.pillarGrid}>
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.kicker} className={styles.pillarCard}>
                  <div className={styles.pillarIcon}>
                    <Icon size={24} strokeWidth={1.6} />
                  </div>
                  <span className={styles.pillarKicker}>{pillar.kicker}</span>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarDesc}>{pillar.description}</p>
                  <span className={styles.pillarTag}>{pillar.tag}</span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 플랜 */}
      <section className={styles.section} id="plans">
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>조직 규모에 맞는 플랜</h2>
            <p className={styles.sectionSubtitle}>
              조직 규모와 동시에 온보딩할 수 있는 인원 수를 기준으로 네 단계로 나눴습니다.
            </p>
          </div>

          <div className={styles.planGrid}>
            {PLANS.map((plan) => {
              const price = cycle === 'annual' ? plan.annual : plan.monthly;
              const isFree = price === 0;

              return (
                <article
                  key={plan.id}
                  className={`${styles.planCard} ${plan.featured ? styles.planCardFeatured : ''}`}
                >
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <p className={styles.planTagline}>{plan.tagline}</p>

                  <div className={styles.planPriceRow}>
                    {plan.customPrice ? (
                      <span className={styles.planPrice}>{plan.customPrice}</span>
                    ) : (
                      <>
                        <span className={styles.planPrice}>
                          {isFree ? '₩0' : won(price as number)}
                        </span>
                        <span className={styles.planPriceUnit}>/ 월</span>
                      </>
                    )}
                  </div>
                  <p className={styles.planPriceNote}>
                    {plan.customPrice
                      ? '조직 요구사항에 맞춰 산정'
                      : isFree
                        ? '기본료 없이 파일럿 진행'
                        : cycle === 'annual'
                          ? '연간 선결제 · 두 달치 무료 적용가'
                          : '부가세 별도 · 월 단위 해지'}
                  </p>

                  <div className={styles.planSeat}>
                    <div className={styles.planSeatLabel}>Active Seat</div>
                    <div className={styles.planSeatValue}>{plan.seatLabel}</div>
                    <div className={styles.planSeatExtra}>{plan.seatExtra}</div>
                  </div>

                  <ul className={styles.planFeatures}>
                    {plan.features.map((feature) => (
                      <li key={feature} className={styles.planFeature}>
                        <Check size={16} strokeWidth={2.4} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button type="button" className={styles.planCta} disabled>
                    {plan.ctaLabel}
                  </button>
                </article>
              );
            })}
          </div>

          <p className={styles.planFootnote}>
            모든 플랜에서 관리자 · 멘토 · 기존 직원은 인원 제한 없이 무료입니다. 표기 금액은 부가세 별도이며,
            프로토타입 단계이므로 결제와 문의 버튼은 비활성화되어 있습니다.
          </p>
        </div>
      </section>

      {/* 상세 비교 */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="compare">
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>플랜별 상세 비교</h2>
            <p className={styles.sectionSubtitle}>
              온보딩 시트, 문서, 인공지능, 보안까지 항목별 구성입니다.
            </p>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  {PLANS.map((plan) => (
                    <th key={plan.id} scope="col">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((section) => (
                  <Fragment key={section.group}>
                    <tr className={styles.groupRow}>
                      <td colSpan={PLANS.length + 1}>{section.group}</td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={`${section.group}-${row.label}`}>
                        <th scope="row" className={styles.rowLabel}>
                          {row.label}
                        </th>
                        {row.values.map((value, idx) => (
                          <td
                            key={`${row.label}-${PLANS[idx].id}`}
                            className={styles.cellValue}
                            aria-label={
                              value === true ? '지원' : value === false ? '미지원' : undefined
                            }
                          >
                            {value === true ? (
                              <Check size={17} strokeWidth={2.6} className={styles.iconYes} aria-hidden />
                            ) : value === false ? (
                              <Minus size={17} strokeWidth={2.2} className={styles.iconNo} aria-hidden />
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 설계 원칙 */}
      <section className={styles.section} id="principles">
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>과금 설계 원칙</h2>
            <p className={styles.sectionSubtitle}>
              가격표는 다섯 가지 원칙에서 나왔습니다.
            </p>
          </div>

          <div className={styles.principleGrid}>
            {PRINCIPLES.map((principle) => (
              <article key={principle.title} className={styles.principleCard}>
                <Check size={18} strokeWidth={2.6} className={styles.principleIcon} aria-hidden />
                <div>
                  <h3 className={styles.principleTitle}>{principle.title}</h3>
                  <p className={styles.principleDesc}>{principle.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="faq">
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
          </div>

          <div className={styles.faqList}>
            {FAQS.map((faq) => (
              <details key={faq.question} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <HelpCircle size={20} strokeWidth={1.8} />
                  {faq.question}
                </summary>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <span className={styles.ctaTag}>프로토타입</span>
          <h2 className={styles.ctaTitle}>지금은 수익 모델 설계 단계입니다</h2>
          <p className={styles.ctaDescription}>
            위 플랜과 단가는 MenTalk이 어떤 기준으로 비용을 받을 것인지 보여주기 위한 설계안입니다.
            결제 기능은 아직 제품에 구현되어 있지 않습니다.
          </p>
          <div className={styles.ctaButtons}>
            <button type="button" className={styles.ctaButton} disabled>
              무료로 시작하기
            </button>
            <button type="button" className={styles.ctaButtonSecond} disabled>
              도입 문의
            </button>
          </div>
          <p className={styles.ctaNotice}>
            결제와 문의 기능은 아직 연결되어 있지 않습니다.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            홈으로 돌아가기
          </Link>
          <p className={styles.copyright}>2026 MenTalk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
