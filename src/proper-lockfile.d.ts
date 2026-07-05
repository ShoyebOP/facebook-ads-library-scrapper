declare module 'proper-lockfile' {
    interface LockOptions {
        stale?: number;
        update?: number;
        retries?: number | { retries: number; minTimeout?: number; maxTimeout?: number };
        realpath?: boolean;
        lockfilePath?: string;
        onCompromised?: (err: Error) => void;
    }

    function lock(file: string, options?: LockOptions): Promise<() => Promise<void>>;
    function unlock(file: string): Promise<void>;
    function check(file: string, options?: LockOptions): Promise<boolean>;
    function lockSync(file: string, options?: LockOptions): () => void;

    export { lock, unlock, check, lockSync };
    export default { lock, unlock, check, lockSync };
}
