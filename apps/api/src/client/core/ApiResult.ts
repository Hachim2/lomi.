export class ApiResult<T> {
  constructor(public status: number, public data: T) {}
}