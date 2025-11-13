import { Injectable } from '@nestjs/common';
import { Interface, InterfaceAbi, TransactionDescription } from 'ethers';
import routerAbi from './uniswap-v2.abi.json';

@Injectable()
export class UniswapV2DecoderService {
  private readonly iface = new Interface(routerAbi as InterfaceAbi);

  decode(input?: string): TransactionDescription | null {
    if (!input || input === '0x') {
      return null;
    }

    try {
      return this.iface.parseTransaction({ data: input });
    } catch {
      return null;
    }
  }
}
