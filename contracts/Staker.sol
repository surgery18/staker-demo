// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IToken.sol";

contract Staker {
  using SafeMath for uint;

  string public name = "Staker";
  address public stakeToken;
  address public rewardToken;
  uint public startTime;
  uint public endTime;

  mapping (address => uint) public stakingBalance;
  mapping (address => uint) public rewardBalance;
  mapping (address => bool) public isStaking;
  mapping (address => uint) public startTimes;
  mapping (address => bool) public hasStaked; //just a record if the user staked before or not

  constructor(address _tokenA, address _tokenB, uint _startTime, uint _endTime) public {
    stakeToken = _tokenA;
    rewardToken = _tokenB;
    startTime = _startTime;
    endTime = _endTime;
  }

  modifier inStakeTime {
    require(block.timestamp >= startTime, "Not started yet.");
    require(block.timestamp <= endTime, "Passed the time to stake");
    _;
  }

  event Staking(address indexed _user, uint _amount);
  event UnStaked(address indexed _user, uint _bal, uint _reward);
  event ClaimedRewards(address indexed _user, uint _amount);

  function stake(uint _amount) external inStakeTime {
    require(_amount > 0, "Must stake more than 0 tokens in order to steak.");

    if (isStaking[msg.sender]) {
      //caputure current amounts
      rewardBalance[msg.sender] += calcRewardTotal(msg.sender);
    }
    IERC20 st = IERC20(stakeToken);
    st.transferFrom(msg.sender, address(this), _amount);
    isStaking[msg.sender] = true;
    startTimes[msg.sender] = block.timestamp;
    stakingBalance[msg.sender] += _amount;
    hasStaked[msg.sender] = true;
    emit Staking(msg.sender, _amount);
  }

  function unstake() external {
    //this function will claim their rewards and transfer back their original tokens
    require(isStaking[msg.sender], "Is not staking");
    require(stakingBalance[msg.sender] > 0, "Must have a staking balance greater than 0");
    uint rewards = calcRewardTotal(msg.sender);
    if (rewards > 0) {
      claimRewards();
    }
    IERC20 st = IERC20(stakeToken);
    st.transfer(msg.sender, stakingBalance[msg.sender]);
    uint bal = stakingBalance[msg.sender];
    //clear out the vars
    isStaking[msg.sender] = false;
    startTimes[msg.sender] = 0;
    rewardBalance[msg.sender] = 0;
    stakingBalance[msg.sender] = 0;
    //event
    emit UnStaked(msg.sender, bal, rewards);
  }

  function calcRewardTime(address _addr, uint _time) public view returns (uint) {
    uint time = _time;
    time = time >= endTime ? endTime : time;
    return time - startTimes[_addr];
  }

  function calcRewardTime(address _addr) public view returns (uint) {
    // uint time = block.timestamp;
    // time = time >= endTime ? endTime : time;
    // return time - startTimes[_addr];
    return calcRewardTime(_addr, block.timestamp);
  }

  function calcRewardTotal(address _addr, uint _time) public view returns (uint) {
    /* NOTES FOR HOW TO CALCULATE REWARDS
    A user can earn up to 100 tokens a day per token
    100 = 100 * 10**18 =   100000000000000000000

    how many seconds there are in a day
    24*60*60 = 86400

    convert the seconds to wei
    86400 * 10**18 = 86400000000000000000000

    so you would earn this many tokens per second
    100000000000000000000 / 86400000000000000000000 = 0.00115740740740740740740740740741 tokens per second

    so the formula would be
    rate = 0.00115740740740740740740740740741 * 10**18 = 1157407407407407.4074074074074074
    bal = current balance staked / 10**18
    timeStaked = (currentTime - startTimeStaked)
    rateTime = (timeStaked * rate)
    rewards = rateTime * bal


    Staking for 2 days with 1000 tokens
    rate = 0.00115740740740740740740740740741 * 10**18 = 1157407407407407.4074074074074074
    timeStaked = 86400*2 = 172800
    bal = (1000 * 10**18) / 10**18
    rateTime = (timeStaked * rate) = 200000000000000000000
    rewards =  rateTime * bal = 200000000000000000000000

    one-liner formula
    rewards = ((timeStaked * rate) * (bal/10**18))
    */
    //100 tokens per day
    uint earnPerDay = 100 * 10**18;
    uint secondsPerDay = 60 * 60 * 24;
    uint rate = earnPerDay / secondsPerDay;
    return (calcRewardTime(_addr, _time) * rate) * (stakingBalance[_addr]/10**18);
  }

  function calcRewardTotal(address _addr) public view returns (uint) {
    return calcRewardTotal(_addr, block.timestamp);
  }

  function claimRewards() public {
    uint rewards = calcRewardTotal(msg.sender).add(rewardBalance[msg.sender]);
    require(rewards > 0, "No rewards at this time");
    IToken rt = IToken(rewardToken);
    rt.mint(msg.sender, rewards);
    rewardBalance[msg.sender] = 0;
    startTimes[msg.sender] = block.timestamp;
    emit ClaimedRewards(msg.sender, rewards);
  }
}
