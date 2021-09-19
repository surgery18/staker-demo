const StakerFactory = artifacts.require("StakerFactory")
const BloodToken = artifacts.require("BloodToken")
const WoodToken = artifacts.require("WoodToken")

module.exports = async function (deployer) {
//   deployer.deploy(Migrations)
    await deployer.deploy(StakerFactory)
    const sf = await StakerFactory.deployed()

    await deployer.deploy(WoodToken)
    const woodToken = await WoodToken.deployed()
    await woodToken.transferOwnership(sf.address)

    await deployer.deploy(BloodToken)
    const bloodToken = await BloodToken.deployed()
    await bloodToken.addContractAsAdmin(sf.address)
};
