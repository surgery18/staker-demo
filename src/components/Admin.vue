<template>
  <div class="mt-4">
      <button type="button" class="btn btn-lg btn-success mb-4" @click="showAddStake = true" :disabled="!contractsLoaded">Add Stake</button>
      <table class="table table-bordered table-stripped">
          <thead>
              <tr>
                  <th>Staking Token Address</th>
                  <th>Reward Token Address</th>
                  <th>Start Time</th>
                  <th>End Time</th>
              </tr>
          </thead>
          <tbody>
              <tr v-for="row,index in rows" :key="index">
                  <td v-text="row.stake"></td>
                  <td v-text="row.reward"></td>
                  <td v-text="convDate(row.startTime)"></td>
                  <td v-text="convDate(row.endTime)"></td>
              </tr>
          </tbody>
      </table>

      <modal v-if="showAddStake">
            <template v-slot:header>
                <h3>Add Stake</h3>
            </template>
            <template v-slot:body>
                <div class="mb-3">
                    <label class="form-label">Stake Token Address</label>
                    <input type="email" class="form-control" v-model="stakeToken" />
                </div>
                <div class="mb-3">
                    <label class="form-label">Reward Token Address</label>
                    <input type="email" class="form-control" v-model="rewardToken" />
                </div>
                <div class="row">
                    <div class="col">
                        <label class="form-label">Start Date</label>
                        <input type="datetime-local" class="form-control" v-model="startTime" />
                    </div>
                    <div class="col">
                        <label class="form-label">End Date</label>
                        <input type="datetime-local" class="form-control" v-model="endTime" />
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <div class="text-end">
                    <button class="btn btn-lg btn-secondary mx-4" @click="closeModal">Close</button>
                    <button class="btn btn-lg btn-primary" @click="saveSteak">Save</button>
                </div>
            </template>
        </modal>
  </div>
</template>

<script>
import WoodToken from "../../build/contracts-final/WoodToken.json"
import BloodToken from "../../build/contracts-final/BloodToken.json"
import {mapState} from "vuex"
import Modal from "./Modal.vue"
import moment from "moment"
import Swal from "sweetalert2"

//ADD VALIDATION AN OTHER FEATURES
//BUT AS A DEMO I WILL LEAVE THAT SINCE I AM THE ONLY ADMIN

//ALSO PRE-POPULATING THE STAKE AND REWARD TOKENS WITH MY CUSTOM TOKENS

export default  {
    name: "Admin",
    components: { Modal },
    data() {
        return {
            showAddStake: false,
            stakeToken: "",
            rewardToken: "",
            startTime: moment().format("YYYY-MM-DDTHH:mm"),
            endTime: moment().add(1, "month").format("YYYY-MM-DDTHH:mm"),
            rows: [],
        }
    },
    async mounted() {
        const nid = await web3.eth.net.getId()
        let n = BloodToken.networks[nid]
        if (n) {
            this.rewardToken = n.address
        } 

        n = WoodToken.networks[nid]
        if (n) {
            this.stakeToken = n.address
        }

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
        closeModal() {
            this.showAddStake = false
        },
        async saveSteak() {
            const loader = this.$loading.show({loader: 'bars'})
            try {
                const st =  moment(this.startTime).unix()
                const et = moment(this.endTime).unix()
                console.log(this.stakeToken, this.rewardToken, st, et)
                const receipt = await this.stakerFactoryContract.methods.createFarm(this.stakeToken, this.rewardToken, st, et).send({from: this.walletAddress})
                console.log(receipt)
                loader.hide()
                this.closeModal()
                Swal.fire({
                    icon: "success",
                    title: "Contract Added"
                })
                this.loadFarms()
            } catch (e) {
                console.log(e)
                loader.hide()
            }
        },
        async loadFarms() {
            this.rows = await this.stakerFactoryContract.methods.getFarms().call({from: this.walletAddress})
            // console.log(this.rows)
        },
        convDate(x) {
            return moment.unix(x).format('MM/DD/YYYY')
        }
    }
}
</script>

<style>

</style>