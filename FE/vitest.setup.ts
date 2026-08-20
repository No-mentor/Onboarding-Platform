/**
 * jsdom 은 실제 레이아웃 엔진이 없어 offsetParent 가 항상 null 이다.
 * Modal 의 포커스 트랩이 "화면에 보이는 요소만" 걸러낼 때 offsetParent 를 쓰므로,
 * 테스트 환경에서도 동작하도록 최소한의 값을 채워 준다. (프로덕션 코드는 건드리지 않음)
 */
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  get() {
    return this.parentNode;
  },
});
