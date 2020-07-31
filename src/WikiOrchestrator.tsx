
import {
  MicroOrchestrator,
  i18nextBaseModule,
} from '@uprtcl/micro-orchestrator';

import { LensesModule } from '@uprtcl/lenses';
import { DocumentsModule } from '@uprtcl/documents';
import { WikisModule } from '@uprtcl/wikis'; 
import { CortexModule } from '@uprtcl/cortex';
import { AccessControlModule } from '@uprtcl/access-control';
import { EveesModule, EveesEthereum, EveesHttp } from '@uprtcl/evees';

import { HttpConnection } from '@uprtcl/http-provider';

import { EthereumConnection } from '@uprtcl/ethereum-provider';

import { ApolloClientModule } from '@uprtcl/graphql';
import { DiscoveryModule, CidConfig } from '@uprtcl/multiplatform';



type version = 1 | 0;

export default class WikiOrchestrator {

  private host = 'https://api.intercreativity.io/uprtcl/1';
  //const host = 'http://localhost:3100/uprtcl/1'

  private ethHost = '';

  private httpCidConfig: CidConfig = {
    version: 1,
    type: 'sha3-256',
    codec: 'raw',
    base: 'base58btc',
  };

  private ipfsConfig = {
    host: 'ipfs.intercreativity.io',
    port: 443,
    protocol: 'https',
  };

  private ipfsCidConfig = {
    version: 1 as version,
    type: 'sha2-256',
    codec: 'raw',
    base: 'base58btc',
  };

  private orchestrator: MicroOrchestrator = new MicroOrchestrator();

  private httpConnection = new HttpConnection();
  private ethConnection = new EthereumConnection({ provider: this.ethHost });

  private httpEvees = new EveesHttp(
    this.host,
    this.httpConnection,
    this.ethConnection,
    this.httpCidConfig,
  );

  private ethEvees = new EveesEthereum(
    this.ethConnection,
    this.ipfsConfig,
    this.ipfsCidConfig,
    this.orchestrator.container
  )

  private evees = new EveesModule([this.ethEvees, this.httpEvees], this.httpEvees);
  private documents = new DocumentsModule();
  private wikis = new WikisModule();

  async initializeMicroOrchestrator(web3provider, dispatcher, hasHomeProposal) {
    const modules = [
      new i18nextBaseModule(),
      new ApolloClientModule(),
      new CortexModule(),
      new DiscoveryModule([this.httpEvees.casID]),
      new LensesModule(),
      new AccessControlModule(),
      this.evees,
      this.documents,
      this.wikis,
    ];

    try {
      await this.orchestrator.loadModules(modules);
      // does httpsEvees connect/login belong here or not?
      await this.httpEvees.connect();
      await this.httpEvees.login();

    } catch (e) {
      console.log(e);
    }
  }

  constructor(web3provider, dispatcher, hasHomeProposal) {
    this.initializeMicroOrchestrator(web3provider, dispatcher, hasHomeProposal);
  }

  private static _instance: WikiOrchestrator;

  public static getInstance(web3provider, dispatcher, hasHomeProposal) {
    return (
      this._instance || (this._instance = new this(web3provider, dispatcher, hasHomeProposal))
    )
  }
  
}




