// 시작전에  1. infura goerli api key 발급받고 .env에 입력하기
//         2. 테스트용 goerli private key, address .env에 입력하기

const { ethers } = require("ethers"); // 이더 라이브러리 -> 컨트랙트 가져오고, 개인키로 서명하는 작업들을 한다.
const { EthrDID } = require("ethr-did"); // ethr-did -> did컨트랙트를 활용해 did생성하는 라이브러리
// const {
//   createVerifiableCredentialJwt,
//   verifyCredential,
// } = require("did-jwt-vc");

require("dotenv").config(); //dotenv -> 파일목록중 .env의 변수들을 사용하기 위해 쓰는 라이브러리 .env에는 공개되면 안되는 비밀키, apikey등을 보관한다. .env안의 변수들을 "환경변수" 라고함

const chainNameOrId = 5;
//이더리움 체인중 무엇을 쓰는지 이름 또는 번호를 입력(현재는 5, goeril 테스트넷 이용)

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
// 체인에 접근하기위해서는 이더리움 노드를 통해 접근해야함, 노드를 운영하고있지 않으면 infura, alchemy와 같은 rpc서버 이용

const ISSUER_PK = process.env.ISSUER_PK;
const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS;
//process.env를 이용해 .env파일의 변수들을 읽어옴

const ISSUER_Signer = new ethers.Wallet(ISSUER_PK, provider);
//ether.Wallet 함수는 private key와 provider(현재 infura)를 파라미터로 받아 public key의 주인임을 증명할 수 있는 서명을 생성해준다.

// Issuer DID
const ISSUER_Did = new EthrDID({
  identifier: ISSUER_ADDRESS, //issuer 공개키
  privateKey: ISSUER_PK, //issuer 비밀키
  provider: ISSUER_Signer.provider, //provider -> 현재 infura
  chainNameOrId, //무슨체인? 현재 고얼리 테스트넷
  txSigner: ISSUER_Signer, // 서명 메소드
  alg: "ES256K", //암호화 알고리즘
});

console.log(ISSUER_Did); //issuer의 DID 생성되는것 확인

//콘솔에 찍히는 did document 보면서 중요해보이는 애들 찾아보기 !
