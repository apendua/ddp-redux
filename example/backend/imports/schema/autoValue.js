export function setUserOnInsert() {
  if (!this.isSet && !this.isUpdate) {
    return this.userId;
  }
  return undefined;
}

export function setDateOnInsert() {
  if (!this.isSet && !this.isUpdate) {
    return new Date();
  }
  return undefined;
}

export function setUserOnUpdate() {
  if (this.isUpdate || this.isUpsert) {
    return this.userId;
  }
  return undefined;
}

export function setDateOnUpdate() {
  if (this.isUpdate || this.isUpsert) {
    return new Date();
  }
  return undefined;
}
