# TypeScript Guidelines

> TypeScript를 사용하는 모든 코드에 적용되는 기본 가이드라인입니다.

## 1. 타입 시스템

### Strict Mode
- ✅ 항상 `strict: true` 사용
- ✅ `noImplicitAny`, `strictNullChecks` 활성화
- ❌ `any` 타입 사용 금지 (불가피할 때는 `unknown` 사용 후 type guard)

```typescript
// GOOD: 구체적인 타입
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): User {
  // ...
}

// BAD: any 사용
function getUser(id: any): any {  // NEVER DO THIS
  // ...
}

// GOOD: unknown 사용 후 타입 가드
function processData(data: unknown) {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}
```

### 타입 추론 활용
- ✅ 명시적 타입 선언이 필요할 때만 사용
- ✅ 함수 반환 타입은 명시적으로 선언 (가독성 ↑)

```typescript
// GOOD: 반환 타입 명시
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// OK: 타입 추론으로 충분
const userName = "John";  // string으로 추론됨
```

### 인터페이스 vs 타입
- ✅ 객체 구조 정의: `interface` 사용
- ✅ Union, Tuple, Mapped types: `type` 사용
- ✅ 일관성 있게 사용 (프로젝트 전체 통일)

```typescript
// GOOD: Interface for object shapes
interface User {
  id: number;
  name: string;
}

interface Admin extends User {
  role: 'admin';
}

// GOOD: Type for unions
type Status = 'pending' | 'approved' | 'rejected';
type ID = string | number;
```

## 2. 함수

### 함수 선언 방식
- ✅ 화살표 함수 사용 (일관성)
- ✅ 매개변수에 타입 명시
- ✅ 선택적 매개변수는 `?` 사용
- ✅ 기본값 사용 가능

```typescript
// GOOD: Arrow function with types
const fetchUser = async (id: number): Promise<User> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

// GOOD: Optional parameter
function greet(name: string, greeting?: string): string {
  return `${greeting ?? 'Hello'}, ${name}!`;
}

// GOOD: Default value
function createUser(name: string, age: number = 18): User {
  return { id: generateId(), name, age };
}
```

### 매개변수 객체화
- ✅ 3개 이상의 매개변수는 객체로 묶기

```typescript
// BAD: Too many parameters
function createUser(name: string, email: string, age: number, phone: string): User {
  // ...
}

// GOOD: Object parameter
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  phone: string;
}

function createUser(params: CreateUserParams): User {
  const { name, email, age, phone } = params;
  // ...
}
```

## 3. null과 undefined

### Non-null assertion 피하기
- ❌ `!` 연산자 사용 금지 (런타임 에러 위험)
- ✅ 옵셔널 체이닝(`?.`)과 null 병합(`??`) 사용

```typescript
// BAD: Non-null assertion
const userName = user!.name;  // Runtime error if user is null

// GOOD: Optional chaining
const userName = user?.name ?? 'Anonymous';

// GOOD: Type guard
if (user != null) {
  console.log(user.name);  // TypeScript knows user is not null here
}
```

### 명시적 null 처리
- ✅ null 가능성을 타입으로 표현
- ✅ early return 패턴 사용

```typescript
// GOOD: Explicit null handling
function getDisplayName(user: User | null): string {
  if (user === null) {
    return 'Guest';
  }
  return user.name;
}

// GOOD: Early return
function processUser(user: User | null) {
  if (user === null) return;
  
  // TypeScript knows user is not null here
  console.log(user.name);
}
```

## 4. 제네릭

### 적절한 제네릭 사용
- ✅ 재사용 가능한 코드에 제네릭 적용
- ✅ 제네릭 제약조건(`extends`) 활용

```typescript
// GOOD: Generic with constraint
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

function fetchData<T extends { id: number }>(url: string): Promise<ApiResponse<T>> {
  return fetch(url).then(res => res.json());
}

// Usage
interface User {
  id: number;
  name: string;
}

const response = await fetchData<User>('/api/users/1');
```

### Generic Naming
- ✅ `T`, `U`, `V` - 단일 타입
- ✅ `K`, `V` - Key, Value
- ✅ 의미 있는 이름도 가능 (ex: `ElementType`)

```typescript
// Standard names
function map<T, U>(array: T[], fn: (item: T) => U): U[] {
  return array.map(fn);
}

// Meaningful names
interface Container<ElementType> {
  value: ElementType;
  timestamp: number;
}
```

## 5. 유틸리티 타입 활용

### 자주 사용하는 유틸리티 타입

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Partial: 모든 속성을 optional로
type PartialUser = Partial<User>;
// { id?: number; name?: string; ... }

// Pick: 특정 속성만 선택
type UserSummary = Pick<User, 'id' | 'name'>;
// { id: number; name: string; }

// Omit: 특정 속성 제외
type UserWithoutEmail = Omit<User, 'email'>;
// { id: number; name: string; age: number; }

// Required: 모든 속성을 required로
type RequiredUser = Required<PartialUser>;

// Readonly: 모든 속성을 readonly로
type ReadonlyUser = Readonly<User>;

// Record: Key-Value 타입
type UserDictionary = Record<string, User>;
```

## 6. React/Next.js 특화

### 컴포넌트 Props 타입
- ✅ `interface`로 Props 정의
- ✅ `children` 타입 명시 (`ReactNode`)
- ✅ 이벤트 핸들러 타입 사용

```typescript
import { ReactNode, MouseEvent } from 'react';

// GOOD: Component props interface
interface ButtonProps {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

function Button({ children, onClick, disabled, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className={variant}>
      {children}
    </button>
  );
}
```

### Custom Hooks
- ✅ 반환 타입 명시
- ✅ Hook은 `use` 접두사 사용

```typescript
// GOOD: Custom hook with types
interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

function useCounter(initialValue: number = 0): UseCounterReturn {
  const [count, setCount] = useState<number>(initialValue);
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  
  return { count, increment, decrement, reset };
}
```

### API Response 타입
- ✅ API 응답 타입 명확히 정의
- ✅ Error response 타입도 정의

```typescript
// API Response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

// Usage
async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const result: ApiResponse<User> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.data;
}
```

## 7. 에러 처리

### 타입이 보장되는 에러 처리
- ✅ `unknown` 타입으로 에러 캐치 후 type guard
- ✅ 커스텀 에러 클래스 사용

```typescript
// GOOD: Type-safe error handling
class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchData(): Promise<Data> {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new ApiError('Failed to fetch', response.status);
    }
    return await response.json();
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      console.error(`API Error: ${error.message} (${error.statusCode})`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}
```

## 8. 파일/모듈 구조

### barrel export
- ✅ index.ts에서 모듈 통합 export

```typescript
// components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';

// Usage
import { Button, Input, Card } from '@/components';
```

### Path alias
- ✅ `@/` prefix로 절대 경로 사용
- ✅ `tsconfig.json`에서 paths 설정

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

---

**Remember**: TypeScript는 JavaScript에 타입을 더한 것이 아니라, 더 안전하고 유지보수하기 쉬운 코드를 작성하기 위한 도구입니다. 🎯