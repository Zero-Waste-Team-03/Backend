import { randomUUID } from 'crypto';

export function v4() {
    return randomUUID();
}

export function v7() {
    return randomUUID();
}

export default { v4, v7 };
