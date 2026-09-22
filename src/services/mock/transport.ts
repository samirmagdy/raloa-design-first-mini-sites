import { repositoryError, type RepositoryError, type Result, ok, fail } from '../contracts/result';
import { getNetworkMode, readDatabase } from '../storage/store';

type Work<T> = () => Result<T>;

let counter = 0;

const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });

const OFFLINE_ERROR = repositoryError('network', {
  en: 'You appear to be offline. Nothing was changed.',
  ar: 'يبدو أن الاتصال منقطع. لم يتم تغيير أي شيء.'
});

const RETRY_ERROR = repositoryError('network', {
  en: 'The request timed out. Try again.',
  ar: 'انتهت مهلة الطلب. أعد المحاولة.'
});

/**
 * Every mock method runs through here, which is what makes Phase 22's "network failure simulation"
 * a setting instead of a code change. `flaky` fails every third call, deterministically.
 */
export const respond = async <T,>(work: Work<T>): Promise<Result<T>> => {
  const mode = getNetworkMode();
  counter += 1;

  if (mode === 'offline') return fail(OFFLINE_ERROR);
  await wait(mode === 'slow' ? 900 : 90 + (counter % 5) * 40);
  if (mode === 'flaky' && counter % 3 === 0) return fail(RETRY_ERROR);

  return work();
};

export const notFound = (what: string): RepositoryError =>
  repositoryError('not_found', {
    en: `That ${what} no longer exists. It may have been deleted in another tab.`,
    ar: `هذا ${what} لم يعد موجوداً. ربما تم حذفه في تبويب آخر.`
  });

export const conflict = (currentVersion: number): RepositoryError =>
  repositoryError('conflict', {
    en: 'This page changed since you opened it.',
    ar: 'تم تعديل هذه الصفحة منذ فتحها.'
  }, { currentVersion });

export const unauthorized = (): RepositoryError =>
  repositoryError('unauthorized', { en: 'Sign in to continue.', ar: 'سجّل الدخول للمتابعة.' });

export const validationError = (field: string, message: { en: string; ar: string }): RepositoryError =>
  repositoryError('validation', message, { fields: [{ field, message }] });

export const database = readDatabase;

export const clone = <T,>(value: T): T => (typeof structuredClone === 'function'
  ? structuredClone(value)
  : (JSON.parse(JSON.stringify(value)) as T));
