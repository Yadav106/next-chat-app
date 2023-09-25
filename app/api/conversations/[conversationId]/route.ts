import getCurrentUser from "@/app/actions/getCurrentUser";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb"
import { pusherServer } from "@/app/libs/pusher";

interface IParams {
    conversationId?: string;
}

export async function DELETE(
    request: Request,
    { params }: { params: IParams }
) {
    console.log(request);
    try {
        const { conversationId } = params;
        const currentUser = await getCurrentUser();
        console.log('checkpoint 1');
        

        if (!currentUser?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('checkpoint 2');
        
        const existingConversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId
            },
            include: {
                users: true
            }
        });

        console.log('checkpoint 3');

        if(!existingConversation) {
            return new NextResponse('Invalid ID', { status: 404 });
        }

        console.log('checkpoint 4');

        const deletedConversation = await prisma.conversation.deleteMany({
            where: {
                id: conversationId,
                userIds: {
                    hasSome: [currentUser.id]
                }
            }
        });

        existingConversation.users.forEach(user => {
            if (user.email) {
                pusherServer.trigger(
                    user.email,
                    'conversation:remove',
                    existingConversation
                )
            }
        })

        console.log('checkpoint 5');

        return NextResponse.json(deletedConversation)

    } catch (err: any) {
        console.log(request);
        
        console.log(err, 'ERROR_CONVERSATION_DELETE');
        return new NextResponse('Internal Error', { status: 500 });
    }
}