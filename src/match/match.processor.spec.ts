import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { MatchProcessor } from './match.processor';
import { RedisService } from '../data/redis.service';
import { UserService } from '../user/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('MatchProcessor', () => {
  let matchProcessor: MatchProcessor;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchProcessor,
        {
          provide: getQueueToken('matchQueue'),
          useValue: {
            add: jest.fn(),
            removeRepeatableByKey: jest.fn(),
            getJob: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            findUserByScore: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    matchProcessor = module.get<MatchProcessor>(MatchProcessor);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should find user by score successfully', async () => {
    const score = 100;
    const targetUserId = 1;

    jest
      .spyOn(redisService, 'findUserByScore')
      .mockResolvedValueOnce(targetUserId);

    const result = await matchProcessor['findUserByScore'](score);

    expect(result).toBe(targetUserId);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 50);
  });

  it('should retry finding user by score if not found initially', async () => {
    const score = 100;
    const targetUserId = 1;

    jest
      .spyOn(redisService, 'findUserByScore')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(targetUserId);

    const result = await matchProcessor['findUserByScore'](score);

    expect(result).toBe(targetUserId);
    expect(redisService.findUserByScore).toHaveBeenCalledTimes(3);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 50);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 100);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 150);
  });

  it('should return null if user not found after retries', async () => {
    const score = 500;

    jest.spyOn(redisService, 'findUserByScore').mockResolvedValue(null);

    const result = await matchProcessor['findUserByScore'](score);

    expect(result).toBeNull();
    expect(redisService.findUserByScore).toHaveBeenCalledTimes(3);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 50);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 100);
    expect(redisService.findUserByScore).toHaveBeenCalledWith(score, 150);
  });
});
