# TypeScript Code Review Checklist

> TypeScript 코드 리뷰 시 확인해야 할 항목들입니다.

## 🔴 Critical (반드시 확인)

### Type Safety
- [ ] `any` 타입 사용이 없는가?
- [ ] `strict: true` 설정을 따르는가?
- [ ] `unknown` 사용 후 type guard가 있는가?

```typescript
// ❌ Bad
function processData(data: any): any {
    return data.value;
}

// ✅ Good
function processData<T>(data: Data<T>): T {
    return data.value;
}

// ✅ Good: unknown with type guard
function handleData(data: unknown) {
    if (typeof data === 'string') {
        console.log(data.toUpperCase());
    }
}
```

### Null Safety
- [ ] Non-null assertion (`!`) 사용이 없는가?
- [ ] Optional chaining (`?.`)이 적절히 사용되었는가?
- [ ] Nullish coalescing (`??`)이 적절히 사용되었는가?

```typescript
// ❌ Bad
const length = nullableString!.length;

// ✅ Good
const length = nullableString?.length ?? 0;
```

## 🟠 Major (중요)

### Interface vs Type
- [ ] 객체 구조는 `interface`를 사용했는가?
- [ ] Union, Tuple은 `type`을 사용했는가?
- [ ] 일관된 컨벤션을 따르는가?

```typescript
// ✅ Good: Interface for object shapes
interface User {
    id: number;
    name: string;
}

interface Admin extends User {
    role: 'admin';
}

// ✅ Good: Type for unions
type Status = 'pending' | 'approved' | 'rejected';
type ID = string | number;
```

### Function Design
- [ ] 함수 매개변수가 3개 이하인가? (4개 이상은 객체로)
- [ ] 반환 타입이 명시되었는가?
- [ ] Arrow function이 일관되게 사용되었는가?

```typescript
// ❌ Bad
function createUser(name: string, email: string, age: number, phone: string, address: string)

// ✅ Good
interface CreateUserParams {
    name: string;
    email: string;
    age: number;
    phone: string;
    address: string;
}

function createUser(params: CreateUserParams): User {
    // ...
}
```

### Generics
- [ ] Generic이 적절히 사용되었는가?
- [ ] Generic constraint (`extends`)가 필요한 경우 사용되었는가?
- [ ] Generic naming이 일관되었는가?

```typescript
// ✅ Good
interface ApiResponse<T> {
    data: T;
    status: number;
}

function fetchData<T extends { id: number }>(url: string): Promise<ApiResponse<T>> {
    return fetch(url).then(res => res.json());
}
```

## 🟡 Minor (권장)

### Utility Types
- [ ] `Partial`, `Pick`, `Omit` 등 유틸리티 타입이 활용되었는가?
- [ ] `Readonly`가 필요한 경우 사용되었는가?
- [ ] `Required`가 필요한 경우 사용되었는가?

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

// ✅ Good
function updateUser(id: number, updates: Partial<User>) {
    // ...
}

type UserSummary = Pick<User, 'id' | 'name'>;
type CreateUserRequest = Omit<User, 'id'>;
```

### Async/Await
- [ ] Promise 체이닝 대신 async/await을 사용했는가?
- [ ] 에러 처리가 적절히 되었는가?
- [ ] Parallel execution이 필요한 경우 `Promise.all`을 사용했는가?

```typescript
// ❌ Bad
fetchUser(id)
    .then(user => fetchPosts(user.id))
    .then(posts => console.log(posts))
    .catch(error => console.error(error));

// ✅ Good
async function loadUserData(id: number) {
    try {
        const user = await fetchUser(id);
        const posts = await fetchPosts(user.id);
        console.log(posts);
    } catch (error) {
        console.error(error);
    }
}

// ✅ Good: Parallel execution
const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts()
]);
```

### Destructuring
- [ ] 객체/배열 destructuring이 적절히 사용되었는가?
- [ ] Nested destructuring이 과도하지 않은가?

```typescript
// ✅ Good
function processUser({ id, name, email }: User) {
    console.log(id, name, email);
}

// ✅ Good
const { data: users, error } = useQuery(['users'], fetchUsers);
```

## 🟢 Style (스타일)

### Naming Conventions
- [ ] Interface: PascalCase (`UserService`)
- [ ] Type: PascalCase (`UserStatus`)
- [ ] Function/Variable: camelCase (`getUserById`)
- [ ] Constant: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- [ ] Enum members: PascalCase (`Status.Pending`)

```typescript
// ✅ Good
interface UserService {
    getUserById(id: number): Promise<User>;
}

enum Status {
    Pending = 'PENDING',
    Approved = 'APPROVED'
}

const MAX_RETRY_COUNT = 3;
```

### Import Order
- [ ] Import가 일관된 순서로 정렬되었는가?
- [ ] External imports → Internal imports 순서인가?

```typescript
// ✅ Good
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { fetchUser } from '@/api/user';
```

### Path Aliases
- [ ] `@/` prefix가 사용되었는가?
- [ ] 상대 경로 (`../`)가 최소화되었는가?

```typescript
// ❌ Bad
import { Button } from '../../../components/Button';

// ✅ Good
import { Button } from '@/components/Button';
```

## ⚛️ React/Next.js 특화

### Component Design
- [ ] 함수형 컴포넌트를 사용했는가?
- [ ] Props 타입이 명확한가?
- [ ] `React.FC` 사용을 피했는가?

```typescript
// ❌ Bad: React.FC
const UserCard: React.FC<UserCardProps> = ({ user }) => {
    return <div>{user.name}</div>;
};

// ✅ Good
interface UserCardProps {
    user: User;
}

function UserCard({ user }: UserCardProps) {
    return <div>{user.name}</div>;
}
```

### Custom Hooks
- [ ] Hook은 `use` 접두사로 시작하는가?
- [ ] Hook이 단일 책임을 가지는가?
- [ ] Hook의 반환 타입이 명확한가?

```typescript
// ✅ Good
interface UseCounterReturn {
    count: number;
    increment: () => void;
    decrement: () => void;
}

function useCounter(initialValue: number = 0): UseCounterReturn {
    const [count, setCount] = useState(initialValue);
    
    const increment = useCallback(() => setCount(c => c + 1), []);
    const decrement = useCallback(() => setCount(c => c - 1), []);
    
    return { count, increment, decrement };
}
```

### State Management
- [ ] `useState`가 적절히 사용되었는가?
- [ ] `useReducer`가 복잡한 상태에 사용되었는가?
- [ ] `useMemo`/`useCallback`이 적절히 사용되었는가?

```typescript
// ✅ Good: useReducer for complex state
interface State {
    users: User[];
    loading: boolean;
    error: Error | null;
}

type Action =
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: User[] }
    | { type: 'FETCH_ERROR'; payload: Error };

function userReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, users: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        default:
            return state;
    }
}
```

## 🧪 Testing

### Test Structure
- [ ] 테스트 이름이 명확한가?
- [ ] AAA (Arrange-Act-Assert) 패턴을 따르는가?
- [ ] 테스트가 독립적인가?

```typescript
// ✅ Good
describe('UserService', () => {
    describe('getUser', () => {
        it('should return user when found', async () => {
            // Arrange
            const userId = 1;
            const mockUser = { id: userId, name: 'John' };
            jest.spyOn(api, 'getUser').mockResolvedValue(mockUser);
            
            // Act
            const result = await userService.getUser(userId);
            
            // Assert
            expect(result).toEqual(mockUser);
        });
        
        it('should throw error when user not found', async () => {
            // Arrange
            jest.spyOn(api, 'getUser').mockRejectedValue(new Error('Not found'));
            
            // Act & Assert
            await expect(userService.getUser(999)).rejects.toThrow('Not found');
        });
    });
});
```

### Mocking
- [ ] `jest.mock`가 적절히 사용되었는가?
- [ ] Mock data가 테스트와 분리되어 있는가?

```typescript
// ✅ Good
jest.mock('@/api/user');

const mockUsers: User[] = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
];

beforeEach(() => {
    jest.clearAllMocks();
});
```

## 📝 Documentation

### JSDoc
- [ ] Public API에 JSDoc이 작성되었는가?
- [ ] Parameter와 return value가 문서화되었는가?

```typescript
/**
 * 사용자를 생성합니다.
 *
 * @param params - 사용자 생성에 필요한 정보
 * @returns 생성된 사용자 객체
 * @throws {ValidationError} 입력값이 유효하지 않은 경우
 *
 * @example
 * const user = await createUser({
 *   name: 'John',
 *   email: 'john@example.com'
 * });
 */
async function createUser(params: CreateUserParams): Promise<User> {
    // ...
}
```

---

**Remember**: TypeScript는 자바스크립트에 타입을 더하는 것이 아니라, 더 안전하고 유지보수하기 쉬운 코드를 작성하기 위한 도구입니다! 🎯