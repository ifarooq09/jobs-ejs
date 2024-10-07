const app = require('../app.js')
const get_chai = require('../util/get_chai.js')

describe("test getting a page", function () {
    it("should get the index page", async () => {
        const { expect, request } = await get_chai();
        const req = request.execute(app).get("/").send();
        const res = await req;
        expect(res).to.have.status(200);
        expect(res).to.have.property("text");
        expect(res.text).to.include("Click this link");
    });
});