export const RedisKeys = {
  USER_BY_ID: (id: number) => `user:id:${id}`,
  USER_BY_NAME: (name: string) => `user:name:${name}`,
  MATCH_WAIT_BY_ID: (id: number) => `match_wait:id:${id}`,
  LAST_USER_ID: 'last_user_id',
  SCORE_RANKING: 'score:ranking',
  MATCH_WAIT_ID: 'match_wait:id',
};
