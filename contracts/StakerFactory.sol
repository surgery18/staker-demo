// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Staker.sol";
import "./IToken.sol";

contract StakerFactory is Ownable {
  using SafeMath for uint;

  //a farm is when you can add a token and get rewards
  mapping (uint => address) public farms;
  uint public totalFarms;
  mapping(address => mapping(address => uint)) public faucetTimes;
  uint public FAUCET_TIME = 1 days; //you can only grab x amount in a day
  uint public FAUCET_AMOUNT = 1000 * 10**18; //this is how many tokens they get

  event FacetTokensToUser(address indexed _token, address indexed _user, uint _amount);
  event FarmAdded(address indexed _stakeAddress);

  struct Farm {
    address farm;
    address stake;
    address reward;
    uint startTime;
    uint endTime;
  }

  function createFarm(address _tokenA, address _tokenB, uint startTime, uint endTime) public onlyOwner {
    //TOKEN B MUST BE OWNED BY THE CONTRACT! OR HAS PERMISSIONS TO APPROVE OTHER CONTRACTS TO MINT TOKENS
    Staker staker = new Staker(_tokenA, _tokenB, startTime, endTime);
    farms[totalFarms] = address(staker);
    //add permissions for the reward token to mint tokens for the reward
    IToken it = IToken(_tokenB);
    it.addContractToMinterRole(address(staker));
    totalFarms = totalFarms.add(1);
    emit FarmAdded(address(staker));
  }

  function getFarms() view public returns(Farm[] memory) {
    Farm[] memory ret = new Farm[](totalFarms);
    for(uint i = 0; i < totalFarms; i++) {
      Staker s = Staker(farms[i]);
      ret[i] = Farm(farms[i], s.stakeToken(), s.rewardToken(), s.startTime(), s.endTime());
    }
    return ret;
  }

  function faucetTokens(address _tokenAddr, address _user) external {
    //first check how much time past since last called
    uint lastTime = faucetTimes[_tokenAddr][_user];
    require (lastTime == 0 || (lastTime + FAUCET_TIME) < block.timestamp, "You cannot get more tokens now");
    faucetTimes[_tokenAddr][_user] = block.timestamp;
    IToken _token = IToken(_tokenAddr);
    require(_token.owner() == address(this), "Cannot faucet these tokens to user");
    // uint bal = _token.balanceOf(address(this));
    // require(bal >= FAUCET_AMOUNT, "Does not have enough tokens to provide you with.");
    //now send them the tokens
    _token.mint(_user, FAUCET_AMOUNT);
    //send event
    emit FacetTokensToUser(_tokenAddr, _user, FAUCET_AMOUNT);
  }
}
