import { bootstrap } from './app/bootstrap.ts';
import { createWechatPlatform } from './platform/wechat/index.ts';

bootstrap(createWechatPlatform());
