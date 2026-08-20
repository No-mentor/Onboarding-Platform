import PricingContent from './pricing-content';

export const metadata = {
  title: 'MenTalk — 요금제',
  description:
    '전 직원 좌석이 아니라 온보딩이 진행 중인 신입 수에 연동되는 요금제. 관리자와 멘토, 기존 직원은 무제한 무료입니다.',
};

export default function PricingPage() {
  return <PricingContent />;
}
