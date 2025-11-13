# Swap Scope (PoC)
이더리움 멤풀에서 **Uniswap V2 스왑 트랜잭션만 포착·디코딩**하고,  
**별도의 시뮬레이션/실행 엔진이 사용할 수 있는 데이터**를 만드는 MEV 분석용 PoC 프로젝트

---

## 1. Overview

### What
이 프로젝트는 이더리움 멤풀(pending transactions)에서 **Uniswap V2 Router**로 전달되는 스왑 트랜잭션만 선별하여,  
이를 구조화된 데이터(**SwapIntent + SimulationInput**) 형태로 추출하는 것을 목표로 한다.

### Why
MEV 전략(샌드위치, 아비트라지 등)을 실행하려면, 단순히 “누가 어떤 토큰을 스왑하려고 한다”를 아는 것만으론 부족하다.
- 해당 풀의 현재 유동성(reserve)
- 0.3% Uniswap V2 수수료 반영
- 특정 자본(플래시 론)을 썼을 때 실제로 이익이 나는지 여부

이런 정보가 필요하다. 이 프로젝트는 **그런 시뮬레이션을 위한 입력 데이터**를 제공하는 역할만 한다.

### How
- 멤풀에서 pending tx 스트림을 받고
- Uniswap V2 Router 스왑 트랜잭션을 디코딩하고
- 관련 풀의 on-chain 유동성 상태(reserves)를 조회해서
- “이 트랜잭션 기준으로 시뮬레이션할 때 필요한 모든 데이터”를 한 번에 모은 구조체로 내보낸다.

---

## 2. Problem Definition

일반 이더리움 멤풀에는 매우 다양한 종류의 트랜잭션이 섞여 있어 스왑 트랜잭션만 파악하기 어렵다.  
특히 스왑 입력값(input data)은 HEX로 인코딩되어 있으며 ABI 구조를 모르면 읽을 수 없다.

**문제 1: 스왑 트랜잭션 식별 문제**
- 멤풀 트랜잭션에서 Uniswap V2 스왑 트랜잭션만 필터링하기 어렵다.
- HEX input data는 ABI 디코딩 없이는 의미를 이해할 수 없다.

**문제 2: 시뮬레이션 준비 데이터 부족 문제**
- 단순히 “토큰 A→B, amountIn, amountOutMin” 정보만 있으면 **실제 이익 계산**을 할 수 없다.
- 해당 풀의 현재 유동성(reserve0, reserve1)을 알아야
    - 0.3% 수수료를 반영한 실제 교환 비율
    - 가격 영향(price impact)
    - a 풀, b 풀에서 각각 얼마나 스왑해야 이익이 되는지  
      시뮬레이션할 수 있다.

**문제 3: 역할 분리 필요**
- 시뮬레이션 + 번들 생성 + Flashbots 제출 + 플래시 론 실행은 또 다른 프로젝트에서 담당한다.
- 이 프로젝트는 그 “위 단계”가 먹을 **입력 데이터 공급자(data provider)** 역할만 해야 한다.

---

## 3. Goal

### 3.1 1차 목표: 스왑 정보 추출 파이프라인 구축
- `newPendingTransactions` 구독
- Uniswap V2 Router로 향하는 트랜잭션만 필터
- 콜데이터(ABI input) 디코딩
- 스왑 함수 판별
- 토큰 경로(path) 기반 tokenIn/tokenOut 추출
- Factory.getPair(token0, token1) 기반 풀 주소 계산

### 3.2 2차 목표: 시뮬레이션용 데이터 제공
Uniswap V2 (v2 only) 기준으로, 시뮬레이션 엔진이 바로 쓸 수 있는 데이터 구조 제공:

- 기본 스왑 의도 정보 (SwapIntent)
- 해당 풀의 현재 유동성 상태
    - reserve0, reserve1
    - token0, token1
- 스왑 방향에 맞춘 **입력/출력 기준 유동성**
- Uniswap V2 0.3% 수수료 정보
- 관련된 gasPrice, value(ETH in/out) 등 메타데이터

시뮬레이션/실행 프로젝트는 이 데이터를 기반으로
- “이 트랜잭션 주변에서 a 유동성, b 유동성에 대해 각각 얼마나 스왑하면 이익인지”
- 플래시 론 크기 결정
- 번들링 후 Flashbots 제출 여부  
  를 판단하게 된다.

---

## 4. Scope & Non-Goals

### In-Scope (이 프로젝트가 하는 일)
- 이더리움 멤풀 스트리밍
- Uniswap V2 Router 스왑 트랜잭션 식별 및 디코딩
- 해당 풀(pair)의 on-chain 유동성(reserves) 조회
- 0.3% 수수료(fee = 0.003) 기반 시뮬레이션에 필요한 입력값 제공
- SwapIntent + SimulationInput 데이터 구조 생성 및 외부로 발행

### Out-of-Scope (다른 프로젝트가 하는 일)
- “실제 이익이 나는지” 계산 (시뮬레이션 로직)
- a 유동성, b 유동성에서 **얼마나 스왑할지** 결정하는 알고리즘
- 플래시 론 실행(자본 조달), 유니스왑 콜백 함수 구현
- 번들링 + Flashbots(또는 Flashbots-like) 제출 로직
- MEV 전략(샌드위치, 아비트라지 등) 구체 구현

이 프로젝트는 **데이터 공급자(Data Provider)** 이고,  
실제 전략/시뮬레이션/실행은 **별도 MEV Executor/Simulator 프로젝트**의 책임이다.

---

## 5. Requirements

### 5.1 Functional Requirements

1) 멤풀 연결
- WebSocket RPC를 통해 `eth_subscribe` `newPendingTransactions` 사용
- 전달받은 txHash로 `eth_getTransactionByHash` 호출

2) Uniswap V2 Router 트랜잭션 필터링
- 설정(config)으로 Uniswap V2 Router 주소 지정
- `tx.to`가 라우터 주소와 일치하는 pending tx만 다음 단계로 전달

3) 콜데이터 디코딩
- Uniswap V2 Router ABI를 사용해 `input` 필드 디코딩
- 스왑 관련 함수만 지원 (PoC 단계):
    - `swapExactTokensForTokens`
    - `swapTokensForExactTokens`
    - `swapExactETHForTokens`
    - `swapExactTokensForETH`

4) 스왑 트랜잭션 식별
- 디코딩 결과의 `method`가 스왑 함수 목록에 속하는 경우에만 “스왑 트랜잭션”으로 분류

5) 풀(pair) 주소 계산/조회 (v2 only)
- Uniswap V2 Factory의 `getPair(token0, token1)` 호출
- 또는 사전 로딩된 풀 정보 캐시 사용
- `path[0]`, `path[1]` 기준으로 주요 풀 주소(pairAddress) 결정

6) 풀 유동성 상태 조회
- Pair 컨트랙트의 `getReserves()` 호출
- 반환값(reserve0, reserve1, blockTimestampLast)과 함께
    - pair에 매핑된 token0, token1 주소 조회
- 시뮬레이션 프로젝트가 바로 사용 가능한 형태로 데이터 제공

7) SwapIntent 도메인 모델 생성

```typescript
type SwapIntent = {
  txHash: string;
  fromAddress: string;
  routerAddress: string;
  poolAddress: string;
  fromToken: string;
  toToken: string;
  amountIn: bigint;
  amountOutMin: bigint;
  path: string[];
  deadline?: number;
  createdAt: number;
};
```

8) SimulationInput 모델 생성 (시뮬레이션용 데이터)

```typescript
type SwapSimulationInput = {
  // MEV 타깃 트랜잭션 정보
  intent: SwapIntent;

  // 대상 풀 상태 (Uniswap V2 pair)
  pair: {
    address: string;
    token0: string;
    token1: string;
    reserve0: bigint;
    reserve1: bigint;
  };

  // 스왑 방향에 맞춰 정규화된 유동성 정보
  normalized: {
    // intent.fromToken 기준으로 본 입력/출력 유동성
    reserveIn: bigint;
    reserveOut: bigint;
  };

  // 수수료 정보 (v2 고정 0.3% = 0.003)
  fee: {
    rate: number;  // 0.003
  };

  // 시뮬레이션 메타데이터
  meta: {
    gasPrice: bigint;
    value: bigint;        // ETH 전송 값
    blockNumber?: number; // 관측 시점
  };
};
```

9) 감시 대상 풀/토큰 기준 필터
- 설정으로 WATCHED_POOLS, WATCHED_TOKENS 목록을 받는다.
- SwapIntent.poolAddress ∈ WATCHED_POOLS 이거나,
- fromToken/toToken 중 하나 ∈ WATCHED_TOKENS 인 경우만 최종 출력

10) 출력 방식
  - 콘솔 로그
  - 로컬 파일(JSONL) 저장
  - HTTP API로 최신 SwapSimulationInput 리스트 조회
  - WebSocket으로 실시간 푸시

### 5.2 Non-Functional Requirements

- 낮은 지연시간(수백 ms 수준)
- RPC/WebSocket 끊김 시 자동 재연결
- 디코딩 실패/에러 로깅
- 타입 안정성 (TypeScript)
- DEX/체인 확장 용이한 모듈 구조

## 6. Architecture

```text
+-----------------------------+
|   Ethereum Node (WS RPC)    |
+-------------+---------------+
              |
              v
+-----------------------------+
| MempoolModule               |
|  - MempoolService           |
|  - newPendingTransactions   |
+-------------+---------------+
              |
              v
+-----------------------------+
| UniswapV2Module             |
|  - UniswapV2DecoderService  |
|  - UniswapV2PoolService     |
|  - 스왑 메서드 판별         |
+-------------+---------------+
              |
              v
+-----------------------------+
| SimulationInputModule       |
|  - IntentBuilderService     |
|  - SimulationInputService   |
+-------------+---------------+
              |
              v
+-----------------------------+
| ApiModule / GatewayModule   |
|  - REST / WebSocket API     |
|  - 다른 시스템에 제공       |
+-----------------------------+

```

## 7. Project Structure 

```text
eth-swap-scope/
  src/
    app.module.ts

    config/
      config.module.ts
      config.service.ts       # RPC URL, Router 주소, 감시 풀/토큰

    infra/
      ethers.module.ts        # ethers Provider 등록
      ethers.service.ts
      logger.module.ts
      logger.service.ts

    domain/
      models/
        swap-intent.model.ts
        swap-simulation-input.model.ts

    mempool/
      mempool.module.ts
      mempool.service.ts      # newPendingTransactions 구독
      mempool.listener.ts?    # 필요시 이벤트 리스너 역할

    uniswap-v2/
      uniswap-v2.module.ts
      uniswap-v2.abi.json
      uniswap-v2-decoder.service.ts   # input data 디코딩
      uniswap-v2-classifier.service.ts# 스왑 메서드 판별
      uniswap-v2-pool-directory.service.ts # pair 조회/캐시
      uniswap-v2-pool-state.service.ts     # getReserves 래퍼
      uniswap-v2.builder.ts                # SwapIntent 빌더

    simulation-input/
      simulation-input.module.ts
      simulation-input.service.ts  # SwapSimulationInput 생성

    api/
      api.module.ts
      simulation.controller.ts     # REST API (예: GET /simulations/latest)
      simulation.gateway.ts?       # WebSocket (옵션)

  package.json
  tsconfig.json
  nest-cli.json
  README.md

```

## 8. 8. Modules & Responsibilities
### 8.1 ConfigModule
- RPC URL, Uniswap V2 Router 주소
- Factory 주소, 감시 풀/토큰 리스트(WATCHED_POOLS, WATCHED_TOKENS)
- 환경 변수 → ConfigService로 주입

### 8.2 Infra (EthersModule)
- ethers.providers.WebSocketProvider 생성
- DI 토큰으로 Provider 등록 (예: ETH_WS_PROVIDER)
- 다른 서비스에서 주입받아 사용

### 8.3 MempoolModule
- MempoolService
  - WebSocket eth_subscribe: newPendingTransactions 사용
  - txHash 수신 시 eth_getTransactionByHash 호출
  - UniswapV2Module 쪽으로 raw tx 전달 (예: RxJS Subject/Observable, EventEmitter, NestJS Event 시스템 등)

### 8.4 UniswapV2Module
- UniswapV2DecoderService
  - Router ABI 로딩
  - input data 디코딩
- UniswapV2ClassifierService
  - 스왑 메서드인지 여부 판단
- UniswapV2PoolDirectoryService
  - Factory.getPair() 래핑
  - (옵션) pair 주소 캐싱
- UniswapV2PoolStateService
  - pair.getReserves() 호출
- UniswapV2Builder
  - 위 정보들을 종합해 SwapIntent 생성

### 8.5 SimulationInputModule
- SimulationInputService
  - SwapIntent + pair reserves + 메타데이터를 받아 SwapSimulationInput 생성
  - reserve0/1 → reserveIn/out을 스왑 방향에 맞게 정규화
  - fee.rate = 0.003 세팅

### 8.6 ApiModule / GatewayModule
- SimulationController
  - 예: GET /simulation-inputs/recent
- (옵션) SimulationGateway
  - WebSocket으로 실시간 SwapSimulationInput push

## 9. 타겟 ABI 

```json 
[{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"amountADesired","type":"uint256"},{"internalType":"uint256","name":"amountBDesired","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountTokenDesired","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountIn","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountOut","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsIn","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"reserveA","type":"uint256"},{"internalType":"uint256","name":"reserveB","type":"uint256"}],"name":"quote","outputs":[{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETHSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermit","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermitSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityWithPermit","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapETHForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETHSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]
```

