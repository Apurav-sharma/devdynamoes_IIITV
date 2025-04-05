import connectdb from "@/database/connectdb";
import { NextResponse } from "next/server";
import Subscription from "@/models/subscription";
import User from "@/models/user";

export async function POST(req) {
    try {
        await connectdb();

        const { user, plan, price, paymentId, email } = await req.json();
        // console.log(id);

        if (!user || !plan || !paymentId || !price || !email) {
            return NextResponse.json({ message: "Parameters is required" }, { status: 400 });
        }

        const mentor = await User.findOne({ email: email });

        if (!mentor) {
            return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
        }

        const new_sub = new Subscription({
            user,
            plan,
            price,
            paymentId,
            mentor: mentor._id
        });

        await new_sub.save();
        return NextResponse.json({ message: "subscription added successfully" }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
