'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, FileText, Users, Zap, TrendingUp, Clock, CheckCircle2, BarChart3 } from 'lucide-react';
import styles from './page.module.css';

export default function LandingPage() {
  const stats = [
    { label: '30일', description: '체계적인 온보딩 기간' },
    { label: '80%', description: '신입 적응률 증가' },
    { label: '50%', description: '인수인계 시간 단축' },
  ];

  const features = [
    {
      icon: FileText,
      title: '체계적인 인수인계 계획',
      description: '30일 단계별 온보딩 계획으로 신입 직원의 성장을 체계적으로 관리하세요.',
      highlights: ['맞춤형 일정 관리', '진행 상황 실시간 추적', '팀원 협업'],
    },
    {
      icon: Zap,
      title: '인공지능 기반 맞춤 추천',
      description: '인공지능이 학습한 업무 자료를 바탕으로 필요한 내용을 정확하게 추천합니다.',
      highlights: ['문서 검색 증강 적용', '맥락 기반 추천', '실시간 학습'],
    },
    {
      icon: Users,
      title: '팀 협업 관리',
      description: '팀원과 함께 진행 현황을 확인하고 피드백을 나누며 협력하세요.',
      highlights: ['멤버 초대 관리', '실시간 피드백', '권한 기반 접근'],
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Image
              src="/logo.png"
              alt="OnboardOS 로고"
              width={40}
              height={40}
            />
            <span className={styles.logoText}>OnboardOS</span>
          </div>
          <nav className={styles.nav}>
            <Link href="#features" className={styles.navLink}>
              기능
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

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <TrendingUp size={16} />
            신입 인수인계의 미래
          </div>
          <h1 className={styles.heroTitle}>
            인공지능이 설계하는<br />
            <span className={styles.highlight}>신입 온보딩 플랫폼</span>
          </h1>
          <p className={styles.heroSubtitle}>
            체계적인 온보딩 프로세스와 인공지능 기반 추천으로
            신입 직원의 빠른 적응과 팀의 효율성을 동시에 달성하세요.
          </p>
          <div className={styles.heroCTA}>
            <Link href="/login" className={styles.ctaPrimary}>
              지금 시작하기
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className={styles.ctaSecondary}>
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statsContent}>
          {stats.map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={styles.statValue}>{stat.label}</div>
              <div className={styles.statLabel}>{stat.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features} id="features">
        <div className={styles.featuresContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>엔터프라이즈급 기능</h2>
            <p className={styles.sectionSubtitle}>
              조직의 성장을 지원하는 통합 온보딩 솔루션
            </p>
          </div>

          <div className={styles.featureGrid}>
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className={styles.featureCard}>
                  <div className={styles.featureIconWrapper}>
                    <div className={styles.featureIcon}>
                      <IconComponent size={32} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                  <ul className={styles.highlights}>
                    {feature.highlights.map((highlight, hIdx) => (
                      <li key={hIdx} className={styles.highlightItem}>
                        <CheckCircle2 size={16} />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className={styles.valueSection}>
        <div className={styles.valueContent}>
          <div className={styles.valueColumn}>
            <h2 className={styles.valueTitle}>신입의 입장</h2>
            <ul className={styles.valueList}>
              <li className={styles.valueItem}>
                <Clock size={20} />
                <div>
                  <div className={styles.valueItemTitle}>효율적인 학습</div>
                  <div className={styles.valueItemDesc}>인공지능이 추천하는 맞춤형 업무로 빠른 적응</div>
                </div>
              </li>
              <li className={styles.valueItem}>
                <BarChart3 size={20} />
                <div>
                  <div className={styles.valueItemTitle}>진행 현황 추적</div>
                  <div className={styles.valueItemDesc}>실시간 진행률 확인으로 안심할 수 있는 온보딩</div>
                </div>
              </li>
              <li className={styles.valueItem}>
                <Users size={20} />
                <div>
                  <div className={styles.valueItemTitle}>팀과의 협력</div>
                  <div className={styles.valueItemDesc}>멘토와 실시간 소통하며 성장</div>
                </div>
              </li>
            </ul>
          </div>

          <div className={styles.valueColumn}>
            <h2 className={styles.valueTitle}>조직의 입장</h2>
            <ul className={styles.valueList}>
              <li className={styles.valueItem}>
                <TrendingUp size={20} />
                <div>
                  <div className={styles.valueItemTitle}>생산성 향상</div>
                  <div className={styles.valueItemDesc}>신입 적응 시간 단축으로 팀 효율성 증대</div>
                </div>
              </li>
              <li className={styles.valueItem}>
                <CheckCircle2 size={20} />
                <div>
                  <div className={styles.valueItemTitle}>체계적 관리</div>
                  <div className={styles.valueItemDesc}>온보딩 프로세스 표준화로 일관된 품질 보장</div>
                </div>
              </li>
              <li className={styles.valueItem}>
                <FileText size={20} />
                <div>
                  <div className={styles.valueItemTitle}>지식 축적</div>
                  <div className={styles.valueItemDesc}>조직의 업무 지식을 체계적으로 축적 및 활용</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>신입 온보딩의 혁신을 경험하세요</h2>
          <p className={styles.ctaDescription}>
            OnboardOS로 조직의 온보딩 문화를 개선하고 팀의 성장을 가속화하세요.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/login" className={styles.ctaButton}>
              무료로 시작하기
            </Link>
            <Link href="/login" className={styles.ctaButtonSecond}>
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <div className={styles.footerLogoIcon}>■</div>
                <span className={styles.footerLogoText}>OnboardOS</span>
              </div>
              <p className={styles.footerTagline}>
                신입·인수인계 담당자의 조직 적응을
                인공지능이 설계·운영·분석하는 엔터프라이즈 SaaS
              </p>
            </div>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.footerSectionTitle}>서비스</h4>
            <ul className={styles.footerLinks}>
              <li>
                <Link href="/login">로그인</Link>
              </li>
              <li>
                <Link href="/login">회원가입</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerDivider}></div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            2024 OnboardOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
