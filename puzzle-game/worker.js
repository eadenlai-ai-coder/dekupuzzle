// Cloudflare Worker - 蝶库拼拼乐排行榜后端

// KV 命名空间绑定为 LEADERBOARD

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /leaderboard - 获取排行榜
      if (url.pathname === '/leaderboard' && request.method === 'GET') {
        const data = await env.LEADERBOARD.get('scores', { type: 'json' }) || [];
        
        // 排序：时间升序，时间相同步数升序
        const sorted = data.sort((a, b) => {
          if (a.time !== b.time) return a.time - b.time;
          return a.moves - b.moves;
        }).slice(0, 20); // 只返回前20

        return new Response(JSON.stringify(sorted), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /leaderboard - 提交成绩
      if (url.pathname === '/leaderboard' && request.method === 'POST') {
        const body = await request.json();
        
        // 验证数据
        if (!body.name || typeof body.time !== 'number' || typeof body.moves !== 'number') {
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 获取现有数据
        let scores = await env.LEADERBOARD.get('scores', { type: 'json' }) || [];
        
        // 添加新记录
        const newEntry = {
          name: body.name.slice(0, 12), // 限制名字长度
          time: body.time,
          moves: body.moves,
          date: new Date().toISOString(),
        };
        
        scores.push(newEntry);
        
        // 排序并只保留前50名（防止数据过大）
        scores = scores.sort((a, b) => {
          if (a.time !== b.time) return a.time - b.time;
          return a.moves - b.moves;
        }).slice(0, 50);
        
        // 保存到 KV
        await env.LEADERBOARD.put('scores', JSON.stringify(scores));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};