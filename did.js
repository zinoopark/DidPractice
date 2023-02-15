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


const { ethers } = require('ethers');
const { EthrDID, DelegateTypes } = require('ethr-did');
const {
  createVerifiableCredentialJwt,
  verifyCredential,
} = require('did-jwt-vc');
const { getDate } = require('../helper/did');
const db = require('../sequelize/models');

require('dotenv').config();
const chainNameOrId = 5;
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const ISSUER_PK = process.env.ISSUER_PK;
const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS;

const ISSUER_Signer = new ethers.Wallet(ISSUER_PK, provider);

// Issuer DID
const ISSUER_Did = new EthrDID({
  identifier: ISSUER_ADDRESS,
  privateKey: ISSUER_PK,
  provider: ISSUER_Signer.provider,
  chainNameOrId,
  txSigner: ISSUER_Signer,
  alg: 'ES256K',
});

module.exports = {
  claimVC: async (req, res) => {
    let responseData;
    try {
      const { walletAddress, expiresIn } = req.body;

      // 회원 정보 조회
      const userInfo = await db['user'].findOne({
        where: {
          wallet_address: walletAddress,
        },
      });

      // RETURN : 회원정보 없을 경우 return Error
      if (userInfo == null) {
        responseData = {
          message: 'No User Info',
        };
        return res.status(400).send(responseData);
      }

      // Create Holder DID
      const subjectDid = new EthrDID({
        chainNameOrId,
        identifier: walletAddress,
      });

      // User Info From DB
      const {
        email,
        sure_name,
        given_name,
        nick_name,
        national,
        country_code,
        phone_number,
        wallet_address,
      } = userInfo;

      // W3C 표준 V1 데이터 모델 Credential 데이터
      const vcPayload = {
        sub: subjectDid.did,
        vc: {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiableCredential'],
          credentialSubject: {
            issuer: {
              Authority: 'IATA',
              Message:
                'This Credentials is valid for all countries unless otherwise endorsed.',
              Address: ISSUER_ADDRESS,
            },
            user: {
              email,
              sure_name,
              given_name,
              nick_name,
              national,
              country_code,
              phone_number,
              wallet_address,
              DateOfIssue: getDate(),
            },
          },
        },
      };

      // ISSUER : VC ID 생성 후, ERC1056 DID Registry에 등록
      const addDelegate = await ISSUER_Did.createSigningDelegate(
        DelegateTypes.veriKey,
        expiresIn
      );

      // VC JWT 서명할 VC ID 준비
      const issuerDelegateKp = new EthrDID(
        Object.assign(Object.assign({}, addDelegate.kp), { chainNameOrId })
      );

      // Sign JWT VC : 최종적인 JWT VC 데이터
      const vcJwt = await createVerifiableCredentialJwt(
        vcPayload,
        issuerDelegateKp
      );

      // 기존 VC 있는지 확인
      // const vcInfo = await db['vc_list'].findOne({
      //   where: {
      //     user_id: userInfo.id,
      //   },
      // });

      // RETURN : 기존 VC 있는 경우 갱신, UPDATE
      // if (vcInfo !== null) {
      //   const vcSaveInfo = await db['vc_list'].update(
      //     {
      //       vc: vcJwt,
      //     },
      //     {
      //       where: {
      //         user_id: userInfo.id,
      //       },
      //     }
      //   );
      //   responseData = {
      //     user_id: vcInfo.user_id,
      //     did: vcInfo.did,
      //     vc: vcJwt,
      //   };
      //   return res.status(200).send(responseData);
      // }

      // 기존 VC 없는 경우 발급, INSERT
      // const vcSaveInfo = await db['vc_list'].create({
      //   user_id: userInfo.id,
      //   did: subjectDid.did,
      //   vc: vcJwt,
      // });

      responseData = {
        vc: vcJwt,
      };
      return res.status(200).send(responseData);
    } catch (error) {
      responseData = {
        message: 'Claim VC API ERROR',
        error,
      };
      return res.status(404).send(responseData);
    }
  },

  // DID VC는 SSI를 실형하기 위해 유저가 보관해야 한다는 피드백으로 DB에 저장된 VC JWT 요청 API 삭제
  // requestVC: async (req, res) => {
  //   let responseData;
  //   try {
  //     const { walletAddress } = req.body;

  //     // Create Holder DID
  //     const subjectDid = new EthrDID({
  //       chainNameOrId,
  //       identifier: walletAddress,
  //     });

  //     const vcInfo = await db['vc_list'].findOne({
  //       where: {
  //         did: subjectDid.did,
  //       },
  //     });

  //     // RETURN : vc 정보가 없을 경우 return Error
  //     if (vcInfo == null) {
  //       responseData = {
  //         vc: null,
  //       };
  //       return res.status(204).send(responseData);
  //     }

  //     responseData = {
  //       vc: vcInfo.vc,
  //     };
  //     return res.status(200).send(responseData);
  //   } catch (error) {
  //     console.log(`Request VC API ERROR : ${error}`);
  //     responseData = {
  //       ok: false,
  //       message: 'Request VC API ERROR',
  //       data: {
  //         error: error,
  //       },
  //     };
  //     return res.status(404).send(responseData);
  //   }
  // },
};
