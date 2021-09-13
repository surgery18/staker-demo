const { time } = require('@openzeppelin/test-helpers')

const StakerFactory = artifacts.require("StakerFactory")
const WoodToken = artifacts.require("WoodToken")

require('chai')
  .use(require('chai-as-promised'))
  .should()

const toWei = (n) => {
    return web3.utils.toWei(n, "ether")
}

const fromWei = (n) => {
    return web3.utils.fromWei(n, "ether")
}

const BN = web3.utils.BN

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("StakerFactory", function ([deployer, investor]) {
  let factory, token
  before(async () => {
    factory = await StakerFactory.new()
    token = await WoodToken.new()
    
    //transfer ownership to the contract
    await token.transferOwnership(factory.address)

    //send all the tokens to the factory
    // const ts = await token.totalSupply()
    // await token.transfer(factory.address, ts)
  })

  describe("Faucet", () => {
    it("Should faucet tokens to a user", async() => {
      let bal = await token.balanceOf(investor)
      assert.equal(bal.toString(), "0")

      let result = await factory.faucetTokens(token.address, investor, {from: investor})
      let event = result.logs[0].args
      assert.equal(event._token, token.address)
      assert.equal(event._user, investor)
      assert.equal(event._amount, toWei("1000"))

      bal = await token.balanceOf(investor)
      assert.equal(bal.toString(), toWei("1000"))
    })
    it("Should not give tokens again in the same day", async() => {
      await factory.faucetTokens(token.address, investor, {from: investor}).should.be.rejected
    })
    it("Should give tokens the next day", async() => {
      //advanced time
      //go half a day and make sure it still rejects
      let halfDay = 60*60*12
      await time.increase(halfDay);
      await factory.faucetTokens(token.address, investor, {from: investor}).should.be.rejected
      //another half a day and it should work
      await time.increase(halfDay);
      let result = await factory.faucetTokens(token.address, investor, {from: investor})
      let event = result.logs[0].args
      assert.equal(event._token, token.address)
      assert.equal(event._user, investor)
      assert.equal(event._amount, toWei("1000"))

      bal = await token.balanceOf(investor)
      assert.equal(bal.toString(), toWei("2000"))
    })
  })
});
