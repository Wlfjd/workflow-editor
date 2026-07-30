/**
 * setPointerCapture는 활성 포인터가 없으면 예외를 던진다
 * (예: 테스트의 합성 이벤트, 이미 해제된 포인터). 캡처 실패는 치명적이지 않으므로 무시한다.
 */
export function capturePointer(element: Element | null | undefined, pointerId: number): void {
  try {
    element?.setPointerCapture(pointerId)
  } catch {
    // ignore
  }
}
