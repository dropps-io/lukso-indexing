import { LoggerService } from '@libs/logger/logger.service';
import axios from 'axios';
import { Test, TestingModule } from '@nestjs/testing';

import { IpfsService } from '../apps/indexer/src/ipfs/ipfs.service';

import { MockedFunction } from 'jest-mock';

const hash = 'QmYA2fn8cMbVWo4v95RwcwJVyQsNtnEwHerfWR8UNtEwoE';
jest.mock('axios'); // Mocking axios

// Mocking getRandomGateway
import { getRandomGateway } from '../apps/indexer/src/utils/get-random-gateway';
jest.mock('../apps/indexer/src/utils/get-random-gateway');

describe('IpfsService', () => {
  let service: IpfsService;
  let mockLoggerService: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    mockLoggerService = {
      getChildLogger: jest.fn().mockReturnValue({
        error: jest.fn(),
        // Add other logger methods if needed
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService, { provide: LoggerService, useValue: mockLoggerService }],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should get file from IPFS', async () => {
    const mockResponse = { data: new ArrayBuffer(8) };
    const mockGet = jest.fn().mockResolvedValue(mockResponse);
    (axios as jest.Mocked<typeof axios>).get = mockGet;

    const result = await service.getFileFromIPFS(hash);

    expect(result).toBeInstanceOf(Buffer);
    expect(mockGet).toHaveBeenCalled();
    const expectedUrl = expect.stringContaining(`/ipfs/${hash}`);
    expect(mockGet).toHaveBeenCalledWith(expectedUrl, { responseType: 'arraybuffer' });
  });

  it('should use all different gateways', async () => {
    const mockResponse = { data: new ArrayBuffer(8) };
    (axios as jest.Mocked<typeof axios>).get.mockResolvedValueOnce(mockResponse);

    await service.getFileFromIPFS(hash);

    // Check that the axios.get method was called with a URL that matches the expected pattern
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`ipfs?:\/\/.+/ipfs/${hash}`)),
      { responseType: 'arraybuffer' },
    );
  });

  it('should handle errors', async () => {
    (axios as jest.Mocked<typeof axios>).get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Network Error'));

    await expect(service.getFileFromIPFS(hash)).rejects.toThrow(
      `Failed to retrieve file after 3 attempts.`,
    );
  });

  it('should log correctly', async () => {
    const mockResponse = { data: new ArrayBuffer(8) };
    (axios as jest.Mocked<typeof axios>).get.mockResolvedValueOnce(mockResponse);

    await service.getFileFromIPFS(hash);

    expect(mockLoggerService.getChildLogger).toHaveBeenCalledWith('IpfsGatewayService');
    // Add additional checks for logger methods if needed
  });

  it('should return a valid random gateway URL', () => {
    // Mocking the output of getRandomGateway for deterministic behavior
    const mockedGetRandomGateway = getRandomGateway as unknown as MockedFunction<
      typeof getRandomGateway
    >;

    mockedGetRandomGateway.mockReturnValueOnce('ipfs://example.com/ipfs/');

    const gatewayUrl = service.getRandomGatewayURL();

    // Check if the returned gateway matches the expected pattern
    expect(gatewayUrl).toMatch(/^ipfs?:\/\/.*\/ipfs\//);
  });

  it('should handle repeated invalid gateways', () => {
    const mockedGetRandomGateway = getRandomGateway as jest.MockedFunction<typeof getRandomGateway>;

    mockedGetRandomGateway
      .mockReturnValueOnce('invalidUrl1')
      .mockReturnValueOnce('invalidUrl2')
      .mockReturnValueOnce('ipfs://valid.com/ipfs/');

    const gatewayUrl = service.getRandomGatewayURL();
    expect(gatewayUrl).toMatch(/^ipfs?:\/\/.*\/ipfs\//);
  });

  it('should switch gateways upon failure', async () => {
    const mockedGetRandomGateway = getRandomGateway as jest.MockedFunction<typeof getRandomGateway>;

    mockedGetRandomGateway
      .mockReturnValueOnce('ipfs://fail.com/ipfs/')
      .mockReturnValueOnce('ipfs://success.com/ipfs/');

    (axios as jest.Mocked<typeof axios>).get
      .mockRejectedValueOnce(new Error('Gateway Error'))
      .mockResolvedValueOnce({ data: new ArrayBuffer(8) });

    const result = await service.getFileFromIPFS(hash);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('should handle network timeouts gracefully', async () => {
    (axios as jest.Mocked<typeof axios>).get.mockRejectedValueOnce(new Error('Timeout Error'));

    await expect(service.getFileFromIPFS(hash)).rejects.toThrow('Timeout Error');
  });

  it('should log correctly upon initialization', () => {
    expect(mockLoggerService.getChildLogger).toHaveBeenCalledWith('IpfsGatewayService');
  });

  it('should handle empty hash input gracefully', async () => {
    const emptyHash = '';

    await expect(service.getFileFromIPFS(emptyHash)).rejects.toThrow('Invalid IPFS hash');
  });
});
