// 브라우저에 지갑(주입형 provider)이 있는지. 없으면 연결 버튼이 아무 반응도 없게 되므로 따로 안내한다.
export const hasWallet = () => typeof window !== 'undefined' && !!window.ethereum
export const NO_WALLET = '이 브라우저에서 지갑을 찾지 못했습니다. MetaMask 같은 지갑 확장 프로그램을 설치한 뒤 새로고침하거나, 지갑 앱의 브라우저에서 열어주세요.'
