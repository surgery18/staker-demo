<template>
    <div>
        <h2 class="my-5">Open</h2>
        <p v-if="open.length === 0">Nothing available yet.</p>
        <div class="row">
            <div class="card col-4 m-3" v-for="row,index in open" :key="index">
                <div class="card-body">
                    <h5 class="card-title">Staked {{row.stakeName}} / Reward {{row.rewardName}}</h5>
                    <h6>Staked Amount: {{fromWei(row.stakingBalance)}}</h6>
                    <h6>Rewards Amount: {{fromWei(row.rewardBalance)}}</h6>
                    <div class="input-group">
                        <input type="number" min="0" class="form-control" v-model="row._stake"/>
                        <button type="button" class="btn btn-primary" @click="stake(row)">STAKE</button>
                    </div>
                    <div v-if="row.isStaking" class="row mt-3">
                        <div class="col">
                            <button type="button" class="btn btn-success w-100" @click="rewards(row)">Claim Rewards</button>
                        </div>
                        <div class="col">
                            <button type="button" class="btn btn-danger w-100"  @click="unstake(row)">Unstake ALL</button>
                        </div>
                    </div>
                </div>
                <div class="card-footer text-muted">
                    Ends on {{toDate(row.endTime)}}
                </div>
            </div>
        </div>
        <h2 class="my-5">Closed</h2>
        <p v-if="closed.length === 0">Nothing yet.</p>
        <div class="row">
            <div class="card text-white bg-dark col-4 m-3" v-for="row,index in closed" :key="index" >
                <div class="card-body">
                    <h5 class="card-title">Staked {{row.stakeName}} / Reward {{row.rewardName}}</h5>
                    <div v-if="row.isStaking">
                        <h6>Staked Amount: {{fromWei(row.stakingBalance)}}</h6>
                        <h6>Rewards Amount: {{fromWei(row.rewardBalance)}}</h6>
                        <button type="button" class="btn btn-danger w-100"  @click="unstake(row)">Unstake &amp; Claim Rewards</button>
                    </div>
                </div>
                <div class="card-footer text-muted">
                    Ended on {{toDate(row.endTime)}}
                </div>
            </div>
        </div>

        <modal v-if="showStaking">
            <template v-slot:header>
                <h3>Staking...</h3>
            </template>
            <template v-slot:body>
                <h2>2 APPROVALS REQUIRED</h2>
                <ul>
                    <li>Approve token contract call "approve" to use the function transferFrom</li>
                    <li>Approve stake call to take the froms from your account and stake them</li>
                </ul>
            </template>
            <template v-slot:footer>
                &nbsp;
            </template>
        </modal>
    </div>
</template>

<script>
import Staker from "../../build/contracts-final/Staker.json"
import ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json"
import {mapState} from "vuex"
import moment from "moment"
// import Swal from "sweetalert2"
import Modal from './Modal.vue'

export default {
    components: { Modal },
    name: "Staking",
    data() {
        return {
            open: [],
            closed: [],
            showStaking: false,
        }
    },
    async mounted() {
        if (this.contractsLoaded) {
            this.loadFarms()
        }
    },
    watch: {
        contractsLoaded(v, ov) {
            if (v && !ov) {
                this.loadFarms()
            }
        }
    },
    computed: {
        ...mapState(['walletAddress', 'stakerFactoryContract', 'contractsLoaded'])
    },
    methods: {
        toDate(unix) {
            return moment.unix(unix).format("MM/DD/YYYY hh:mm A")
        },
        async stake(row) {
            if (!row._stake || +row._stake < 0) return
            this.showStaking = true
            // const loader = this.$loading.show({loader: 'bars'})
            try {
                const w = web3.utils.toWei(""+row._stake)
                let receipt = await row.stakeTokenContract.methods.approve(row.address,w).send({from: this.walletAddress})
                console.log(receipt)
                receipt = await row.stakerContract.methods.stake(w).send({from: this.walletAddress})
                console.log(receipt)
                row._stake = ""

                this.loadFarms()
            } catch(e) {
                console.log(e)
            }
            this.showStaking = false
            // loader.hide()
        },
        async unstake(row) {
            const loader = this.$loading.show({loader: 'bars'})
            try {
                const receipt = await row.stakerContract.methods.unstake().send({from: this.walletAddress})
                console.log(receipt)
                this.loadFarms()
            } catch(e) {
                console.log(e)
            }
            loader.hide()
        },
        async rewards(row) {
            const loader = this.$loading.show({loader: 'bars'})
            try {
                const receipt = await row.stakerContract.methods.claimRewards().send({from: this.walletAddress})
                console.log(receipt)
                this.loadFarms()
            } catch(e) {
                console.log(e)
            }
            loader.hide()
        },
        fromWei(x) {
            return web3.utils.fromWei(""+x)
        },
        async loadFarms() {
            this.open = []
            this.closed = []
            this.soon = []
            const loader = this.$loading.show({loader: 'bars'})
            const curBlock = await web3.eth.getBlock('latest')
            // const curTime = curBlock.timestamp
            const curTime = moment().unix()
            console.log(curTime)
            const farms = await this.stakerFactoryContract.methods.getFarms().call({from: this.walletAddress})
            this.farms = []
            for(const row of farms) {
                //fetch stake token contract and reward token contract
                const stakeTokenContract = new web3.eth.Contract(ERC20.abi, row.stake)
                const rewardTokenContract = new web3.eth.Contract(ERC20.abi, row.reward)
                const stakerContract = new web3.eth.Contract(Staker.abi, row.farm)
                const contractAllowance = await stakeTokenContract.methods.allowance(this.walletAddress, row.farm).call({from: this.walletAddress})
                const stakeName = await stakeTokenContract.methods.name().call({from: this.walletAddress})
                const rewardName = await rewardTokenContract.methods.name().call({from: this.walletAddress})
                const isStaking = await stakerContract.methods.isStaking(this.walletAddress).call({from: this.walletAddress})
                let stakingBalance = 0
                let rewardBalance = 0
                if (isStaking) {
                    stakingBalance = await stakerContract.methods.stakingBalance(this.walletAddress).call({from: this.walletAddress})
                    rewardBalance = await stakerContract.methods.rewardBalance(this.walletAddress).call({from: this.walletAddress})
                    const ctime = curTime > row.endTime ? row.endTime : curTime
                    const calBal = await stakerContract.methods.calcRewardTotal(this.walletAddress, ctime).call({from: this.walletAddress})
                    console.log(calBal, rewardBalance)
                    rewardBalance = rewardBalance + calBal
                }

                const tmp = {
                    address: row.farm,
                    stake: row.stake,
                    reward: row.reward,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    stakeTokenContract,
                    stakeName,
                    rewardTokenContract,
                    rewardName,
                    stakerContract,
                    isStaking,
                    stakingBalance,
                    rewardBalance,
                    contractAllowance
                }
                console.log(tmp)

                if (curTime >= row.startTime && curTime <= row.endTime) {
                    // status = 'open'
                    this.open.push(tmp)
                } else if (curTime >= row.endTime) {
                    // status = 'closed'
                    this.closed.push(tmp)
                }
            }
            loader.hide()
        }
    }
}
</script>

<style>

</style>