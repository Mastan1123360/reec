/**
 * lib/domain/async/types.ts
 *
 * Implements Master Engineering Specification Section 25:
 * ASYNCHRONOUS OPERATION SEMANTICS
 *
 * Explicit statuses:
 * IDLE, LOADING, SUCCESS, ERROR
 *
 * Invariant: Never conflate null, undefined, false, or empty arrays interchangeably to mean:
 * - not loaded
 * - loading
 * - failed
 * - empty
 * - unauthorized
 */

import type { ApplicationError } from "@/lib/domain/errors/types";

export type AsyncStatus = "IDLE" | "LOADING" | "SUCCESS" | "ERROR";

export interface IdleAsyncState {
  readonly status: "IDLE";
  readonly data: null;
  readonly error: null;
}

export interface LoadingAsyncState<T> {
  readonly status: "LOADING";
  readonly data: T | null;
  readonly error: null;
}

export interface SuccessAsyncState<T> {
  readonly status: "SUCCESS";
  readonly data: T;
  readonly error: null;
}

export interface ErrorAsyncState<T, E = ApplicationError> {
  readonly status: "ERROR";
  readonly data: T | null;
  readonly error: E;
}

export type AsyncState<T, E = ApplicationError> =
  | IdleAsyncState
  | LoadingAsyncState<T>
  | SuccessAsyncState<T>
  | ErrorAsyncState<T, E>;

export const idleAsyncState = <T>(): AsyncState<T> => ({
  status: "IDLE",
  data: null,
  error: null,
});

export const loadingAsyncState = <T>(previousData: T | null = null): AsyncState<T> => ({
  status: "LOADING",
  data: previousData,
  error: null,
});

export const successAsyncState = <T>(data: T): AsyncState<T> => ({
  status: "SUCCESS",
  data,
  error: null,
});

export const errorAsyncState = <T, E = ApplicationError>(
  error: E,
  previousData: T | null = null
): AsyncState<T, E> => ({
  status: "ERROR",
  data: previousData,
  error,
});

export const isAsyncIdle = <T, E>(state: AsyncState<T, E>): state is IdleAsyncState =>
  state.status === "IDLE";

export const isAsyncLoading = <T, E>(state: AsyncState<T, E>): state is LoadingAsyncState<T> =>
  state.status === "LOADING";

export const isAsyncSuccess = <T, E>(state: AsyncState<T, E>): state is SuccessAsyncState<T> =>
  state.status === "SUCCESS";

export const isAsyncError = <T, E>(state: AsyncState<T, E>): state is ErrorAsyncState<T, E> =>
  state.status === "ERROR";
