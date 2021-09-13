// const { assert } = require('chai')
const { time } = require('@openzeppelin/test-helpers')
const snapshot = require("@openzeppelin/test-helpers/src/snapshot")

const Staker = artifacts.require("Staker")
const WoodToken = artifacts.require("WoodToken")
const BloodToken = artifacts.require("BloodToken")

require('chai')
  .use(require('chai-as-promised'))
  .should()

const toWei = (n) => {
    return web3.utils.toWei(n, "ether")
}

// const fromWei = (n) => {
//     return web3.utils.fromWei(n, "ether")
// }

const BN = web3.utils.BN
const staker = artifacts.require("staker");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Staker", function ([deployer, investor]) {
  let stakeToken, rewardToken, staker, curTime, endTime
  let ss
  before(async() => {
    //capture a snapshot
    ss = await snapshot()
    stakeToken = await WoodToken.new()
    rewardToken = await BloodToken.new()
    const t = await time.latest()
    curTime = t.add(time.duration.days(1))
    endTime = t.add(time.duration.days(14))
    console.log(curTime.toString(), endTime.toString())
    staker = await Staker.new(stakeToken.address, rewardToken.address, curTime, endTime)

    //transfer the ownership of the reward token
    await rewardToken.addToMinterRole(staker.address)

    //give the investor some tokens
    await stakeToken.transfer(investor, toWei("1000"));

    //approve the stake amount ahead of time
    await stakeToken.approve(staker.address, toWei("1000"), {from: investor});
  })
  describe("Staking", () => {
    it("Should not let the user stake before the start time", async() => {
      await staker.stake(toWei("1000"), {from: investor}).should.be.rejected
    })
    it("Should let the user stake tokens at the approriate time", async() => {
      //advanced 1 day
      await time.increaseTo(curTime.toString())
      //now it should be open
      let result = await staker.stake(toWei("1000"), {from: investor})
      let event = result.logs[0].args
      assert.equal(event._user, investor)
      assert.equal(event._amount.toString(), toWei("1000").toString())

      //the user should now be staking
      const isStaking = await staker.isStaking(investor)
      assert.isTrue(isStaking)

      //balance should be 0 of investor
      let bal = await stakeToken.balanceOf(investor)
      assert.equal(bal.toString(), "0")

      //balance should be 1000 of the contract
      bal = await stakeToken.balanceOf(staker.address)
      assert.equal(bal.toString(), toWei("1000"))
    })
    it("Should have gained tokens ~100000 in a day", async() => {
      //increase a day
      const st = await staker.startTimes(investor)
      // const t = +st + +time.duration.days(1)
      const t = new BN(st).add(time.duration.days(1))

      //before increasing it, figure out what the new balance will be by the formula
      const earnPerDay = new BN(toWei("100"))
      const secondsPerDay = new BN(60 * 60 * 24)
      const rate = new BN(earnPerDay).div(secondsPerDay)
      const diff = t.sub(st)
      const reward = new BN(diff).mul(rate).mul(new BN(1000))
      // console.log("Reward should be", fromWei(reward.toString()))

      await time.increaseTo(t.sub(new BN(1))) //subtract 1ms since the next call will be the right time

      //now get reward as of right now
      let bal = await staker.calcRewardTotal(investor)
      // console.log("REWARD BAL", bal.toString())
      assert.equal(bal.toString(), reward.toString())
    })
    it("Should be able to stake more (and stores current rewards in storage)", async() => {
      //give the investor more tokesn
      await stakeToken.transfer(investor, toWei("1000"))
      //approve the stake amount ahead of time
      await stakeToken.approve(staker.address, toWei("1000"), {from: investor});
      //get old start time
      const st = await staker.startTimes(investor)
      //now stake those tokens
      await staker.stake(toWei("1000"), {from: investor})
      //should have added to the reward balance
      let bal = await staker.rewardBalance(investor)
      assert.notEqual(bal.toString(), "0")
      //start time should not be the same
      const st2 = await staker.startTimes(investor)
      assert.notEqual(st, st2)
      //staking balance should be 2000
      bal = await staker.stakingBalance(investor)
      assert.equal(bal.toString(), toWei("2000"))
    })
    it("Should be able to claim the rewards", async() => {
      let result = await staker.claimRewards({from: investor})
      let event = result.logs[0].args
      assert.equal(event._user, investor)
      assert.notEqual(event._amount.toString(), "0")
      let bal = await staker.rewardBalance(investor)
      assert.equal(bal.toString(), "0")
      bal = await rewardToken.balanceOf(investor)
      assert.notEqual(bal.toString(), "0")
    })
    it("Should not get more rewards after ending time", async() => {
      //go to the end
      await time.increaseTo(endTime)
      //grab the reward token count
      const rt = await staker.rewardBalance(investor)
      // const end2 = +end + time.duration.days(2)
      const end = endTime.add(time.duration.days(2))
      await time.increaseTo(end)
      const rt2 = await staker.rewardBalance(investor)
      assert.equal(rt.toString(), rt2.toString())
    })
    it("Should be able to unstake", async() => {
      let result = await staker.unstake({from: investor})
      let event = result.logs[1].args
      assert.equal(event._user, investor)
      assert.equal(event._bal.toString(), toWei("2000").toString())
      assert.notEqual(event._reward.toString(), "0")
      let bal = await stakeToken.balanceOf(investor)
      assert.equal(bal.toString(), toWei("2000"))
      bal = await rewardToken.balanceOf(investor)
      assert.notEqual(bal.toString(), "0")
    })
    it("Should not be able to stake since it ended", async() => {
      await stakeToken.approve(staker.address, toWei("2000"), {from: investor});
      await staker.stake(toWei("2000"), {from: investor}).should.be.rejected
    })
  })
  after(async () => {
    console.log("RESTORING BACK TO ORIGINAL STATE")
    await ss.restore()
  })
});
